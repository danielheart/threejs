import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from 'three-mesh-bvh'

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

var scene, camera, width, height, renderer

const vertexMat = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
})

// window.addEventListener("load", init)
init()
function init() {
    createWorker()
    createScene()
    createLights()
    animate()
    // 监听鼠标点击事件
    document.addEventListener('mousedown', onDocumentMouseDown, false)
}

function createWorker() {
    // 在主线程中

    // 创建并启动Web Worker
    const raycastingWorker = new Worker('distDetectWorker.js')

    // 从Three.js场景中获取物体B
    // const objectB = scene.getObjectByName('objectB') // 假设b物体在场景中的名称为'objectB'

    // 向Web Worker发送物体B，请求进行相交计算
    raycastingWorker.postMessage('begin')

    // 监听Web Worker返回的计算结果
    raycastingWorker.onmessage = function (e) {
        const intersections = e.data
        console.log(intersections)
    }
}

// 创建Raycaster对象
var raycaster = new THREE.Raycaster()
var raycaster2 = new THREE.Raycaster()
const raycastDistance = 5
const validDistance = 1
const validcolors = [0, 1, 0]
const Threshold = 1
const Contrast = -0.3

var faceObj, upperJaw, upperJawOrign, lowerJaw

// icp choose ref dot
function onDocumentMouseDown(event) {
    if (event.button == 0) {
        const start = performance.now()
        detectDistance()
        const end = performance.now()
        console.log(`函数执行时间为 ${end - start} 毫秒`)
    }
}

function detectDistance() {
    // 获取A物体所有顶点
    var colors = []
    const positions = upperJaw.geometry.attributes.position.array
    // 循环所有顶点
    const itemSize = 9
    for (let i = 0; i < positions.length; i += itemSize) {
        // 获取当前顶点
        const vertex = new THREE.Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2],
        )

        // 将顶点坐标转换为世界坐标
        vertex.applyMatrix4(upperJaw.matrixWorld)

        // 获取顶点法线
        const normal = new THREE.Vector3()
        normal.fromArray(upperJaw.geometry.attributes.normal.array, i)

        // 创建射线

        raycaster = new THREE.Raycaster(vertex, normal, 0, raycastDistance)
        raycaster.firstHitOnly = true

        // 检测射线是否与B物体相交
        const intersects = raycaster.intersectObject(faceObj)

        raycaster2 = new THREE.Raycaster(
            vertex,
            normal.negate(),
            0,
            raycastDistance,
        )
        raycaster2.firstHitOnly = true

        // 检测射线是否与B物体相交
        const intersects2 = raycaster2.intersectObject(faceObj)

        // 如果距离小于distance，则将顶点颜色改为绿色
        if (intersects.length > 0 && intersects2.length) {
            if (intersects[0].distance < intersects2[0].distance) {
                if (intersects[0].distance < validDistance) {
                    colors.push(...validcolors)
                    colors.push(...validcolors)
                    colors.push(...validcolors)
                } else {
                    const v = 1 - intersects[0].distance / raycastDistance
                    colors.push(0, 0, v, 0, 0, v, 0, 0, v)
                }
            } else {
                if (intersects2[0].distance < validDistance) {
                    colors.push(...validcolors)
                    colors.push(...validcolors)
                    colors.push(...validcolors)
                } else {
                    const v = 1 - intersects2[0].distance / raycastDistance
                    colors.push(v, v, 0, v, v, 0, v, v, 0)
                }
            }
        } else if (intersects.length > 0) {
            if (intersects[0].distance < validDistance) {
                colors.push(...validcolors)
                colors.push(...validcolors)
                colors.push(...validcolors)
            } else {
                const v = 1 - intersects[0].distance / raycastDistance
                colors.push(0, 0, v, 0, 0, v, 0, 0, v)
            }
        } else if (intersects2.length > 0) {
            if (intersects2[0].distance < validDistance) {
                colors.push(...validcolors)
                colors.push(...validcolors)
                colors.push(...validcolors)
            } else {
                const v = 1 - intersects2[0].distance / raycastDistance
                colors.push(v, v, 0, v, v, 0, v, v, 0)
            }
        } else {
            colors.push(0, 0, 0, 0, 0, 0, 0, 0, 0)
        }
    }
    upperJaw.geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3),
    )
    if (upperJaw.material.type !== 'MeshBasicMaterial') {
        upperJaw.material = vertexMat
        upperJaw.renderOrder = 1000
    }

    // 更新顶点颜色
    upperJaw.geometry.attributes.color.needsUpdate = true

    scene.add(upperJaw)
    // upperJawOrign.visible = false
}

function createScene() {
    width = window.innerWidth
    height = window.innerHeight
    scene = new THREE.Scene()

    //camera
    camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000)
    camera.position.set(0, -600, 300)
    scene.add(camera)

    //renderer
    const canvas = document.querySelector('#world')
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        // alpha: true,
        canvas,
    })
    // renderer.setClearColor(0xf0f5f4, 1)
    renderer.setClearColor(0xffffff, 1)
    // renderer.render(scene, camera)
    renderer.setSize(width, height)
    window.addEventListener('resize', handleWindowResize)

    //add ply models
    const plyLoader = new PLYLoader()
    plyLoader.load('/upperJaw.ply', function (geometry) {
        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            vertexColors: true,
        })
        //adjust contrast
        const colors = geometry.attributes.color.array
        for (let i = 0; i < colors.length; i++) {
            colors[i] = colors[i] + (colors[i] - Threshold) * Contrast
        }
        geometry.attributes.color.needsUpdate = true
        // upperJaw = new THREE.Mesh(geometry, material)
        // scene.add(upperJaw)
    })
    plyLoader.load('/lowerJaw.ply', function (geometry) {
        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            vertexColors: true,
        })

        //adjust contrast
        const colors = geometry.attributes.color.array
        for (let i = 0; i < colors.length; i++) {
            colors[i] = colors[i] + (colors[i] - Threshold) * Contrast
        }
        geometry.attributes.color.needsUpdate = true

        // lowerJaw = new THREE.Mesh(geometry, material)
        // scene.add(lowerJaw)
    })

    //add stl files
    const loader = new STLLoader()
    loader.load('/upperJaw.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({
            color: 0xfffffa,
            side: THREE.DoubleSide,
            shininess: 1000,
        })

        upperJawOrign = new THREE.Mesh(geometry, material)

        //generate merged shape of upperjaw
        let geom = geometry.clone()
        geom.deleteAttribute('normal')
        geom = BufferGeometryUtils.mergeVertices(geom)
        geom.computeVertexNormals()
        // console.log(geom)
        upperJaw = new THREE.Mesh(geom, material)
        scene.add(upperJawOrign)
    })
    loader.load('/lowerJaw.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({
            color: 0xfffffa,
            side: THREE.DoubleSide,
            shininess: 1000,
        })
        lowerJaw = new THREE.Mesh(geometry, material)
        scene.add(lowerJaw)
    })
    loader.load('/plane.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            shininess: 1000,
            opacity: 0.5,
            transparent: true,
        })
        const middle = new THREE.Mesh(geometry, material)
        const left = new THREE.Mesh(geometry, material)
        left.position.x = -30
        const right = new THREE.Mesh(geometry, material)
        right.position.x = 30
        // scene.add(middle, left, right)
    })

    const objLoader = new OBJLoader()
    // objLoader.setMaterials(materials)
    // double side render
    objLoader.load('/smile.obj', function (object) {
        faceObj = object.children[0]

        faceObj.geometry.computeBoundsTree({
            maxLeafTris: 1,
        })
        scene.add(faceObj)
        // console.log(faceObj)
        var textureLoader = new THREE.TextureLoader()
        var texture = textureLoader.load('/smile.png')
        texture.colorSpace = THREE.SRGBColorSpace
        faceObj.material = new THREE.MeshBasicMaterial({
            // color: 0xffffff,
            // vertexColors: true,
            side: THREE.DoubleSide,
            map: texture,
        })
        faceObj.material.wireframe = false
        // 假设您有一个物体实例名为object
        var matrixWorld = new THREE.Matrix4() // 目标变换矩阵

        // 设置目标变换矩阵的值
        matrixWorld.set(
            85,
            -7.968522358991004,
            -31.410874718345475,
            -148.61069340066845,
            -32.398343622027795,
            -23,
            -82.80940226617648,
            -239.9776120850593,
            -0.6983764789465218,
            88.56383248565227,
            -24,
            -54.33415107292474,
            0,
            0,
            0,
            1,
        )
        // 将物体应用变换矩阵

        // faceObj.applyMatrix4(matrixWorld)
        console.log(faceObj.matrixWorld)
    })

    // orbit control
    const controls = new OrbitControls(camera, canvas)
    // controls.enableRotate = false
    controls.mouseButtons.LEFT = null
    controls.mouseButtons.RIGHT = 0
    controls.enablePan = true
    controls.enableZoom = true
    controls.target.set(0, 0, 0)

    controls.update()

    const axesHelper = new THREE.AxesHelper(100)
    axesHelper.material.depthTest = false
    axesHelper.renderOrder = 1
    scene.add(axesHelper)
}

var hemisphereLight, ambientLight, sunlight
function createLights() {
    //hemisphere light
    hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1)
    // an ambient light modifies the global color of a scene and makes the shadows softer
    ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)

    sunlight = new THREE.DirectionalLight(0xffffff, 1)
    sunlight.position.set(0, -200, 300)
    //allow shadow
    sunlight.castShadow = true
    sunlight.shadow.camera.left = -400
    sunlight.shadow.camera.right = 400
    sunlight.shadow.camera.top = 400
    sunlight.shadow.camera.bottom = -400
    sunlight.shadow.camera.near = 1
    sunlight.shadow.camera.far = 1000

    sunlight.shadow.mapSize.width = 2048
    sunlight.shadow.mapSize.height = 2048

    scene.add(hemisphereLight)
    scene.add(sunlight)
}
function handleWindowResize() {
    width = window.innerWidth
    height = window.innerHeight
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
}

function animate() {
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
}
