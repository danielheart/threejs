import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
var scene, camera, width, height, renderer

// window.addEventListener("load", init)
init()
function init() {
   createScene()
   createLights()
   animate()
   // 监听鼠标点击事件
   document.addEventListener('mousedown', onDocumentMouseDown, false)
}

// 创建Raycaster对象
var raycaster = new THREE.Raycaster()
// 创建球体
var dotGeom = new THREE.SphereGeometry(1, 10, 10)
var greenMat = new THREE.MeshBasicMaterial({ color: 0x16c2a6 })
const Threshold = 1
const Contrast = -0.3

// 创建一个鼠标向量
const mouse = new THREE.Vector2()

var faceObj, upperJaw, lowerJaw
let hasGenerateLine = false

// icp choose ref dot
function onDocumentMouseDown(event) {
   if (event.button === 0 && !hasGenerateLine) {
      generateVerticalPlane()
      hasGenerateLine = true
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   //camera
   camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000)
   camera.position.set(0, 400, 0)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   // renderer.setClearColor(0xf0f5f4, 1)
   renderer.setClearColor(0x000000, 1)
   // renderer.render(scene, camera)
   renderer.setSize(width, height)
   window.addEventListener('resize', handleWindowResize)

   // //add ply models
   // const plyLoader = new PLYLoader()
   // plyLoader.load('/upperJaw.ply', function (geometry) {
   //    const material = new THREE.MeshPhongMaterial({
   //       side: THREE.DoubleSide,
   //       vertexColors: true,
   //    })
   //    //adjust contrast
   //    const colors = geometry.attributes.color.array
   //    for (let i = 0; i < colors.length; i++) {
   //       colors[i] = colors[i] + (colors[i] - Threshold) * Contrast
   //    }
   //    geometry.attributes.color.needsUpdate = true
   //    const mesh = new THREE.Mesh(geometry, material)
   //    scene.add(mesh)
   // })
   // plyLoader.load('/lowerJaw.ply', function (geometry) {
   //    const material = new THREE.MeshBasicMaterial({
   //       side: THREE.DoubleSide,
   //       vertexColors: true,
   //    })

   //    //adjust contrast
   //    const colors = geometry.attributes.color.array
   //    for (let i = 0; i < colors.length; i++) {
   //       colors[i] = colors[i] + (colors[i] - Threshold) * Contrast
   //    }
   //    geometry.attributes.color.needsUpdate = true

   //    const mesh = new THREE.Mesh(geometry, material)
   //    scene.add(mesh)
   // })

   //add stl files
   const loader = new STLLoader()
   loader.load('/upperJaw.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xffffff,
         side: THREE.DoubleSide,
         shininess: 500,
      })

      upperJaw = new THREE.Mesh(geometry, material)
      // mesh.rotation.x += -Math.PI / 2
      // mesh.rotation.z += Math.PI / 40
      // const material2 = new THREE.MeshPhongMaterial({
      //    color: 0xffffff,
      //    side: THREE.DoubleSide,
      //    shininess: 1000,
      // })
      // const mesh2 = new THREE.Mesh(geometry, material2)
      // mesh2.material.color.set(0xffffff)
      // mesh2.position.z += 1
      // mesh2.rotation.x += -Math.PI / 2
      scene.add(upperJaw)
   })
   loader.load('/lowerJaw.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xfffffa,
         side: THREE.DoubleSide,
         shininess: 500,
      })
      lowerJaw = new THREE.Mesh(geometry, material)
      //console.log(geometry)
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
      // scene.add(middle)
      // scene.add(middle, left, right)
   })

   const objLoader = new OBJLoader()
   // objLoader.setMaterials(materials)
   // double side render
   objLoader.load('/smile.obj', function (object) {
      faceObj = object.children[0]

      var textureLoader = new THREE.TextureLoader()

      var texture = textureLoader.load('/smile.png')
      texture.colorSpace = THREE.SRGBColorSpace
      faceObj.material = new THREE.MeshBasicMaterial({
         // color: 0xffffff,
         //  vertexColors: true,
         side: THREE.DoubleSide,
         map: texture,
      })
      faceObj.material.wireframe = false

      // 假设您有一个物体实例名为object
      var matrixWorld = new THREE.Matrix4() // 目标变换矩阵

      // 设置目标变换矩阵的值
      matrixWorld.set(
         85.954717945545,
         -7.968522358991004,
         -31.410874718345475,
         -148.61069340066845,
         -32.398343622027795,
         -23.050036076394928,
         -82.80940226617648,
         -239.9776120850593,
         -0.6983764789465218,
         88.56383248565227,
         -24.37855167975533,
         -54.33415107292474,
         0,
         0,
         0,
         1,
      )
      // 将物体应用变换矩阵
      faceObj.applyMatrix4(matrixWorld)
      // console.log(object.matrixWorld)
      // scene.add(faceObj)

      faceObj.updateMatrix()
      faceObj.geometry.applyMatrix4(faceObj.matrix)
      faceObj.position.set(0, 0, 0)
      faceObj.rotation.set(0, 0, 0)
      faceObj.scale.set(1, 1, 1)
      faceObj.updateMatrix()

      // const mat = new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
      // const points = new THREE.Points(faceObj.geometry, mat)
      // scene.add(points)
   })

   // orbit control
   camera.up.set(0, 0, 1)
   const controls = new OrbitControls(camera, canvas)

   controls.mouseButtons.LEFT = null
   controls.mouseButtons.RIGHT = 0
   // controls.enableDamping = true

   controls.update()
}
function generateVerticalPlane() {
   const center1 = centerOfModel(upperJaw)
   const dot1 = new THREE.Mesh(dotGeom, greenMat)
   dot1.position.copy(center1)

   const center2 = centerOfModel(lowerJaw)
   const dot2 = new THREE.Mesh(dotGeom, greenMat)
   dot2.position.copy(center2)

   console.log(center1, center2)

   const geometry = new THREE.BufferGeometry()
   const vertices = new Float32Array([
      center1.x,
      center1.y,
      center1.z,
      center2.x,
      center2.y,
      center2.z,
   ])
   geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
   const line = new THREE.Line(geometry, greenMat)

   scene.add(dot1, dot2, line)
}
function centerOfModel(model) {
   // 获取顶点属性
   const positionAttribute = model.geometry.getAttribute('position')

   // 获取顶点数据
   const vertices = positionAttribute.array

   // 初始化累加坐标的变量
   let totalX = 0
   let totalY = 0
   let totalZ = 0

   // 遍历顶点数据
   for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = vertices[i + 2]
      totalX += x
      totalY += y
      totalZ += z
   }

   // 计算平均坐标
   const numVertices = vertices.length / 3
   const averageX = totalX / numVertices
   const averageY = totalY / numVertices
   const averageZ = totalZ / numVertices
   return new THREE.Vector3(averageX, averageY, averageZ)
}
var hemisphereLight, ambientLight, sunlight
function createLights() {
   //hemisphere light
   hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.75)
   // an ambient light modifies the global color of a scene and makes the shadows softer
   ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
   scene.add(ambientLight)

   sunlight = new THREE.DirectionalLight(0xffffff, 1.5)
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
