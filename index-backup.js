import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from 'three-mesh-bvh'
// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DragControls } from 'three/examples/jsm/controls/DragControls.js'

let canvas = [],
    scenes = [],
    cameras = [],
    renderers = [],
    controls = [],
    dragObjectsUp = [],
    dragObjectsLow = []

let faceObj, faceObjCopy, upperJawCopy, upperJawDetect, lowerJawDetect
const rightCanvas = document.querySelector('#right-world')
const leftUpCanvas = document.querySelector('#left-up-world')
const leftlowCanvas = document.querySelector('#left-low-world')
canvas.push(rightCanvas, leftUpCanvas, leftlowCanvas)

let leftSpaceWidth = leftUpCanvas.clientWidth
let rightSpaceWidth = rightCanvas.clientWidth

let facePositions = [],
    teethPositions = []
let x, y
window.addEventListener('load', init)
function init() {
    createScene()
    loadModel()
    addControl()
    addDragControl()
    createLights()

    animate()
    // 监听鼠标点击事件
    document.addEventListener('mousedown', onDocumentMouseDown, false)
    document.addEventListener('mousemove', function (event) {
        x = event.clientX
        y = event.clientY
    })
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'i') {
            // Ctrl+E
            var exporter = new OBJExporter()
            var result = exporter.parse(faceObj)
            console.log(result)
        }
    })
}

// 创建球体
const faceDotGeom = new THREE.SphereGeometry(0.015, 20, 20)
const faceDotmat = new THREE.MeshPhongMaterial({ color: 0x55aa22 })
const teethDotGeom = new THREE.SphereGeometry(0.8, 20, 20)
const teethDotmat = new THREE.MeshPhongMaterial({ color: 0xff5522 })
// 创建Raycaster对象
let raycaster = new THREE.Raycaster()
// 创建一个鼠标向量
const mouse = new THREE.Vector2()

let isAlign = false

// 创建Raycaster对象
var raycasterFront = new THREE.Raycaster()
var raycasterBack = new THREE.Raycaster()
const raycastDistance = 5
const validDistance = 1
const validcolors = [0, 1, 0]
const vertexMat = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
})
//检测距离
function detectDistance() {
    // for(object of [upperJawDetect,lowerJawDetect])
    // 获取A物体所有顶点
    var colors = []
    // console.log(upperJawDetect)
    const positions = upperJawDetect.geometry.attributes.position.array
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
        vertex.applyMatrix4(upperJawDetect.matrixWorld)

        // 获取顶点法线
        const normal = new THREE.Vector3()
        normal.fromArray(upperJawDetect.geometry.attributes.normal.array, i)

        // 创建射线
        raycasterFront = new THREE.Raycaster(vertex, normal, 0, raycastDistance)
        raycasterFront.firstHitOnly = true

        // 检测射线是否与B物体相交
        const intersects = raycasterFront.intersectObject(faceObj)

        raycasterBack = new THREE.Raycaster(
            vertex,
            normal.negate(),
            0,
            raycastDistance,
        )
        raycasterBack.firstHitOnly = true

        // 检测射线是否与B物体相交
        const intersects2 = raycasterBack.intersectObject(faceObj)
        let closerDirection = ''
        // 如果距离小于distance，则将顶点颜色改为绿色
        if (intersects.length > 0 && intersects2.length) {
            if (intersects[0].distance < intersects2[0].distance) {
                closerDirection = 'front'
            } else {
                closerDirection = 'back'
            }
        }

        if (intersects.length > 0 || closerDirection == 'front') {
            if (intersects[0].distance < validDistance) {
                colors.push(...validcolors)
                colors.push(...validcolors)
                colors.push(...validcolors)
            } else {
                const v = 1 - intersects[0].distance / raycastDistance
                colors.push(0, 0, v, 0, 0, v, 0, 0, v)
            }
        } else if (intersects2.length > 0 || closerDirection == 'back') {
            if (intersects2[0].distance < validDistance) {
                colors.push(...validcolors)
                colors.push(...validcolors)
                colors.push(...validcolors)
            } else {
                const v = 1 - intersects2[0].distance / raycastDistance
                colors.push(v, v, 0, v, v, 0, v, v, 0)
            }
        } else {
            colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1)
        }
    }
    upperJawDetect.geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3),
    )
    if (upperJawDetect.material.type !== 'MeshBasicMaterial') {
        upperJawDetect.material = vertexMat
        upperJawDetect.renderOrder = 1000
    }

    // 更新顶点颜色
    upperJawDetect.geometry.attributes.color.needsUpdate = true

    scenes[0].add(upperJawDetect)
    // upperJaw.visible = false
}
// icp choose ref dot
function onDocumentMouseDown(event) {
    if (event.button == 0) {
        // 计算鼠标点击位置
        mouse.x = (event.clientX / leftSpaceWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 4 + 1

        if (facePositions.length < 4 && mouse.x < 1 && mouse.y > -1) {
            // 更新Raycaster对象
            raycaster.setFromCamera(mouse, cameras[1])

            // 检测鼠标点击位置是否与球体相交
            var intersects = raycaster.intersectObject(faceObjCopy)
            if (intersects.length > 0) {
                // 在点击处生成一个球体
                var sphere = new THREE.Mesh(faceDotGeom, faceDotmat)
                sphere.position.copy(intersects[0].point)
                dragObjectsUp.push(sphere)
                facePositions.push(sphere.position)
                scenes[1].add(sphere)
            }
        }

        if (teethPositions.length < 4 && mouse.x < 1 && mouse.y < -1) {
            // 更新Raycaster对象
            const mouse2 = new THREE.Vector2()
            mouse2.copy(mouse)
            mouse2.y += 2
            // console.log(mouse2)
            raycaster.setFromCamera(mouse2, cameras[2])

            // 检测鼠标点击位置是否与球体相交
            var intersects = raycaster.intersectObject(upperJawCopy)
            if (intersects.length > 0) {
                // 在点击处生成一个球体
                var sphere2 = new THREE.Mesh(teethDotGeom, teethDotmat)

                sphere2.position.copy(intersects[0].point)
                dragObjectsLow.push(sphere2)
                teethPositions.push(sphere2.position)
                scenes[2].add(sphere2)
            }
        }

        if (
            !isAlign &&
            facePositions.length == 4 &&
            teethPositions.length == 4
        ) {
            alignAndDetect()

            isAlign = true
        }
    }
}

function alignAndDetect() {
    const facePositionsCopy = facePositions.map((x) => x.clone())
    for (let i = 0; i < facePositionsCopy.length; i++) {
        facePositionsCopy[i].applyMatrix4(faceObj.matrixWorld)
    }
    const facePositionsArray = facePositionsCopy.flatMap((vector) => [
        vector.x,
        vector.y,
        vector.z,
    ])
    const teethPositionsArray = teethPositions.flatMap((vector) => [
        vector.x,
        vector.y,
        vector.z,
    ])

    // console.log(facePositionsArray, teethPositionsArray)
    const data = {
        moving_object_list: faceObj.matrixWorld.elements,
        moving_list: facePositionsArray,
        fixed_list: teethPositionsArray,
    }
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    }

    fetch(
        'https://d92f2d7cde2e48909c18aad1bae9e3ce.apig.cn-east-3.huaweicloudapis.com/transformation?ai=yh',
        options,
    )
        .then((response) => response.json())
        .then((data) => {
            console.log(data)
            // 假设您有一个物体实例名为object
            var matrixWorld = new THREE.Matrix4() // 目标变换矩阵
            // 设置目标变换矩阵的值
            matrixWorld.set(...data)
            // 将物体应用变换矩阵
            faceObj.applyMatrix4(matrixWorld)
            faceObj.updateWorldMatrix()

            detectDistance()
        })
        .catch((error) => console.error(error))
}

function createScene() {
    for (let i = 0; i < 3; i++) {
        const width = canvas[i].clientWidth
        const height = canvas[i].clientHeight

        scenes[i] = new THREE.Scene()

        //camera
        cameras[i] = new THREE.PerspectiveCamera(35, width / height, 1, 10000)
        cameras[i].position.set(0, -600, 300)

        scenes[i].add(cameras[0])

        //renderer
        renderers[i] = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas: canvas[i],
        })
        renderers[i].setSize(width, height)
    }
    window.addEventListener('resize', handleWindowResize)
}
function addControl() {
    for (let i = 0; i < scenes.length; i++) {
        // orbit control
        controls[i] = new OrbitControls(cameras[i], canvas[i])
        controls[i].mouseButtons.LEFT = null
        controls[i].mouseButtons.RIGHT = 0
        controls[i].enableDamping = true
        if (i == 1) controls[i].minDistance = 0.1
    }
}

function addDragControl() {
    // 创建 DragControls 实例
    const dragControlsUp = new DragControls(
        dragObjectsUp,
        cameras[1],
        renderers[1].domElement,
    )
    const dragControlsLow = new DragControls(
        dragObjectsLow,
        cameras[2],
        renderers[2].domElement,
    )

    // 添加事件监听器
    dragControlsLow.addEventListener('dragstart', function (event) {
        // 设置控制器不可操作
        controls.enabled = false

        // 检测物体是否与其他物体相交
    })

    dragControlsLow.addEventListener('dragend', function (event) {
        // 设置控制器可操作
        controls.enabled = true

        // // 计算鼠标点击位置
        mouse.x = (x / leftSpaceWidth) * 2 - 1
        mouse.y = -(y / window.innerHeight) * 4 + 1
        // 更新Raycaster对象
        const mouse2 = new THREE.Vector2()
        mouse2.copy(mouse)
        mouse2.y += 2

        raycaster.setFromCamera(mouse2, cameras[2])

        // 检测鼠标点击位置是否与球体相交
        var intersects = raycaster.intersectObject(upperJawCopy)
        if (intersects.length > 0) {
            // 将被拖拽的物体吸附到相交的物体上
            console.log('yes!')
            event.object.position.copy(intersects[0].point)
        }
        if (facePositions.length == 4 && teethPositions.length == 4) {
            alignAndDetect()
        }
    })

    dragControlsUp.addEventListener('dragend', function (event) {
        // 设置控制器可操作
        controls.enabled = true

        // // 计算鼠标点击位置
        mouse.x = (x / leftSpaceWidth) * 2 - 1
        mouse.y = -(y / window.innerHeight) * 4 + 1

        raycaster.setFromCamera(mouse, cameras[1])

        // 检测鼠标点击位置是否与球体相交
        var intersects = raycaster.intersectObject(faceObjCopy)
        if (intersects.length > 0) {
            // 将被拖拽的物体吸附到相交的物体上
            console.log('yes!')
            event.object.position.copy(intersects[0].point)
        }
        if (facePositions.length == 4 && teethPositions.length == 4) {
            alignAndDetect()
        }
    })
}
function loadModel() {
    //add stl files
    const loader = new STLLoader()
    loader.load('/upperJaw.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({
            color: 0xfffffa,
            side: THREE.DoubleSide,
            shininess: 1000,
        })

        const mesh = new THREE.Mesh(geometry, material)
        scenes[0].add(mesh)
        upperJawCopy = mesh.clone()
        scenes[2].add(upperJawCopy)

        //generate merged shape of upperjaw
        let geom = geometry.clone()
        geom.deleteAttribute('normal')
        geom = BufferGeometryUtils.mergeVertices(geom)
        geom.computeVertexNormals()
        // console.log(geom)
        upperJawDetect = new THREE.Mesh(geom, material)
    })

    loader.load('/lowerJaw.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({
            color: 0xfffffa,
            side: THREE.DoubleSide,
            shininess: 1000,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scenes[0].add(mesh)
        const meshCopy = mesh.clone()
        scenes[2].add(meshCopy)
        cameras[2].position.set(0, -100, 50)

        //generate merged shape of upperjaw
        let geom = geometry.clone()
        geom.deleteAttribute('normal')
        geom = BufferGeometryUtils.mergeVertices(geom)
        geom.computeVertexNormals()
        // console.log(geom)
        lowerJawDetect = new THREE.Mesh(geom, material)
    })

    const objLoader = new OBJLoader()
    // double side render
    objLoader.load('/smile.obj', function (object) {
        faceObj = object.children[0]

        faceObj.geometry.computeBoundsTree({
            maxLeafTris: 1,
        })
        scenes[0].add(faceObj)

        var textureLoader = new THREE.TextureLoader()
        var texture = textureLoader.load('/smile.png')

        texture.colorSpace = THREE.SRGBColorSpace

        faceObj.material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            map: texture,
        })

        faceObjCopy = faceObj.clone()
        scenes[1].add(faceObjCopy)
        cameras[1].position.set(0, 0, 1)
    })
}

function createLights() {
    for (const scene of scenes) {
        //hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1)
        // an ambient light modifies the global color of a scene and makes the shadows softer
        const ambientLight = new THREE.AmbientLight(0xffffff, 1)

        const sunlight = new THREE.DirectionalLight(0xffffff, 1)
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
        scene.add(ambientLight)
        scene.add(hemisphereLight)
        scene.add(sunlight)
    }
}
function handleWindowResize() {
    for (let i = 0; i < scenes.length; i++) {
        const width = canvas[i].parentElement.clientWidth
        const height =
            i == 0
                ? canvas[i].parentElement.clientHeight
                : canvas[i].clientHeight

        renderers[i].setSize(width, height)
        cameras[i].aspect = width / height
        cameras[i].updateProjectionMatrix()
    }
    leftSpaceWidth = leftUpCanvas.clientWidth
}

function animate() {
    for (let i = 0; i < scenes.length; i++) {
        renderers[i].render(scenes[i], cameras[i])
        controls[i].update()
    }

    requestAnimationFrame(animate)
}
