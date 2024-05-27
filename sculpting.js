import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'dat.gui'
let scene,
   camera,
   width,
   height,
   renderer,
   controls,
   crown,
   crownOutside,
   circle,
   upperJaw,
   lowerJaw
let isDragging = false
let choosedObject
const material = new THREE.MeshPhongMaterial({
   color: 0xece5b8,
   side: THREE.DoubleSide,
   shininess: 30,
   specular: 0x333333,
})

const choosedMaterial = new THREE.MeshPhongMaterial({
   color: 0xbfd9d5,
   side: THREE.DoubleSide,
   shininess: 30,
   specular: 0x333333,
})

window.addEventListener('load', init)
function init() {
   createScene()
   createLights()
   loadModel()
   createGUI()
   animate()
}

// 创建Raycaster对象
var raycaster = new THREE.Raycaster()
// 创建球体
var dotGeom = new THREE.SphereGeometry(0.25, 5, 5)
var dotMat = new THREE.MeshBasicMaterial({ color: 0x16c2a6 })

// 创建一个鼠标向量
const mouse = new THREE.Vector2()
let mode = 'Add'
let brushSize = 2
let strength = 0.5
function onMouseMove(event) {
   event.preventDefault()
   choosedObject = crownOutside

   // 计算鼠标位置
   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

   // 发射射线
   raycaster.setFromCamera(mouse, camera)

   // 获取与射线相交的物体
   const intersects = raycaster.intersectObject(choosedObject)
   if (intersects.length > 0) {
      const clickedPosition = intersects[0].point
      const clickedNormal = intersects[0].face.normal
         .clone()
         .applyMatrix4(choosedObject.matrixWorld)

      const direction = new THREE.Vector3()
      direction.copy(clickedPosition)
      circle.position.copy(clickedPosition)
      circle.visible = true
      circle.lookAt(direction.add(clickedNormal))
      if (isDragging) {
         sculpting(clickedNormal, clickedPosition, choosedObject)
      }
   } else {
      circle.visible = false
   }
}
function sculpting(clickedNormal, clickedPosition, object) {
   // 选中鼠标位置半径brushSize的所有点

   //check joint points
   const attributes = object.geometry.attributes
   const positions = attributes.position.array
   const normals = attributes.normal.array

   const intersect = new THREE.Vector3()
   intersect.copy(clickedPosition)

   const avgNormal = new THREE.Vector3()
   const avgPosition = new THREE.Vector3()
   let count = 0
   if (mode === 'Smooth' || mode === 'Flatten') {
      for (let i = 0; i < positions.length; i += 3) {
         const vertex = new THREE.Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2],
         )
         const distance = vertex.distanceTo(clickedPosition)
         const vertexNormal = new THREE.Vector3(
            normals[i],
            normals[i + 1],
            normals[i + 2],
         ).normalize()
         if (distance < brushSize && vertexNormal.dot(clickedNormal) > 0.5) {
            avgPosition.add(vertex)
            avgNormal.add(vertexNormal)
            count++
         }
      }
      if (count > 0) {
         avgPosition.divideScalar(count)
         avgNormal.divideScalar(count)
      }
   }

   for (let i = 0; i < positions.length; i += 3) {
      const vertex = new THREE.Vector3(
         positions[i],
         positions[i + 1],
         positions[i + 2],
      )
      const distance = vertex.distanceTo(clickedPosition)
      const vertexNormal = new THREE.Vector3(
         normals[i],
         normals[i + 1],
         normals[i + 2],
      ).normalize()

      if (distance < brushSize && vertexNormal.dot(clickedNormal) > -1) {
         let offset =
            (Math.exp(-(((distance / brushSize) * 2) ** 2)) / 20) * strength
         switch (mode) {
            case 'Add':
               positions[i] += clickedNormal.x * offset
               positions[i + 1] += clickedNormal.y * offset
               positions[i + 2] += clickedNormal.z * offset
               break
            case 'Remove':
               positions[i] += -clickedNormal.x * offset
               positions[i + 1] += -clickedNormal.y * offset
               positions[i + 2] += -clickedNormal.z * offset
               break
            case 'Smooth':
               const diffrence = avgPosition.clone().sub(vertex)
               positions[i] += avgNormal.x * diffrence.x * strength * offset
               positions[i + 1] += avgNormal.y * diffrence.y * strength * offset
               positions[i + 2] += avgNormal.z * diffrence.z * strength * offset
               break
            case 'Flatten':
               offset = 2
               break
         }
      }
   }

   attributes.position.needsUpdate = true
   object.geometry.computeVertexNormals(true)
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()
   const scaleRatio = 80
   // camera
   // camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)
   camera = new THREE.OrthographicCamera(
      (width / scaleRatio) * -1, // 左边界
      width / scaleRatio, // 右边界
      height / scaleRatio, // 上边界
      (height / scaleRatio) * -1, // 下边界
      0.1, // 近平面距离
      1000, // 远平面距离
   )

   camera.position.set(0, 100, 50)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0x393939, 1)
   renderer.setSize(width, height)

   // orbit control
   camera.up.set(0, 0, 1)
   controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.MIDDLE = 0

   controls.update()
}
function createGUI() {
   const gui = new dat.GUI()
   const params = {
      mode,
      brushSize,
      strength,
      showColorMap: false,
      showUpperJaw: false,
      showLowerJaw: false,
   }

   const modeControl = gui
      .add(params, 'mode', ['Add', 'Remove', 'Smooth', 'Flatten'])
      .onChange(() => {
         mode = params.mode
      })
   const brushSizeControl = gui
      .add(params, 'brushSize', 0.2, 5, 0.01)
      .onChange(() => {
         brushSize = params.brushSize
         circle.scale.set(brushSize, brushSize, brushSize)
      })
   const strengthControl = gui
      .add(params, 'strength', 0.05, 1, 0.01)
      .onChange(() => {
         strength = params.strength
      })
   gui.add(params, 'showColorMap').onChange(() => {
      //
   })
   gui.add(params, 'showUpperJaw').onChange(() => {
      upperJaw.visible = params.showUpperJaw
   })
   gui.add(params, 'showLowerJaw').onChange(() => {
      lowerJaw.visible = params.showLowerJaw
   })

   // 监听键盘和鼠标滚轮事件
   document.addEventListener('keydown', (event) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
         controls.enableZoom = false
      } else {
         switch (event.key) {
            case 'a':
               modeControl.setValue('Add')
               break
            case 'r':
               modeControl.setValue('Remove')
               break
            case 's':
               modeControl.setValue('Smooth')
               break
            case 'f':
               modeControl.setValue('Flatten')
               break
         }
      }
   })

   document.addEventListener('keyup', (event) => {
      if (!event.shiftKey || !event.ctrlKey || !event.metaKey) {
         controls.enableZoom = true
      }
   })
   let wheelDelta = 0
   window.addEventListener(
      'wheel',
      (event) => {
         if (event.shiftKey) {
            wheelDelta = event.deltaY * 0.001
            brushSizeControl.setValue(params.brushSize + wheelDelta)
         } else if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            wheelDelta = event.deltaY * 0.001
            strengthControl.setValue(params.strength + wheelDelta)
         }
      },
      { passive: false },
   )
}
function loadModel() {
   //add stl files
   const stlLoader = new STLLoader()
   stlLoader.load('/sculpting/upperJaw.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      upperJaw = new THREE.Mesh(geometry, material)
      upperJaw.visible = false
      scene.add(upperJaw)
      // 鼠标移动事件
   })
   stlLoader.load('/sculpting/lowerJaw.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      lowerJaw = new THREE.Mesh(geometry, material)
      lowerJaw.visible = false
      scene.add(lowerJaw)
      // 鼠标移动事件
   })
   stlLoader.load('/sculpting/crownEdge.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      const mesh = new THREE.Mesh(geometry, choosedMaterial)
      scene.add(mesh)
      // 鼠标移动事件
   })
   stlLoader.load('/sculpting/crownInside.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      const mesh = new THREE.Mesh(geometry, choosedMaterial)

      scene.add(mesh)
      // 鼠标移动事件
   })

   stlLoader.load('/sculpting/crownOutside.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      crownOutside = new THREE.Mesh(geometry, choosedMaterial)

      scene.add(crownOutside)
      // 鼠标移动事件
      document.addEventListener('mousedown', (e) => {
         if (e.button === 0) isDragging = true
      })
      document.addEventListener('mouseup', () => (isDragging = false))
      document.addEventListener('mousemove', onMouseMove)
   })

   // 3. 创建一个圆形区域,用于在鼠标悬停时显示
   const circleGeometry = new THREE.BufferGeometry().setFromPoints(
      new THREE.Path().absarc(0, 0, 0.5, 0, Math.PI * 2).getSpacedPoints(50),
   )
   const circleMaterial = new THREE.LineBasicMaterial({
      color: 0x16c2a6,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
   })

   circle = new THREE.Line(circleGeometry, circleMaterial)
   circle.scale.set(brushSize, brushSize, brushSize)
   circle.position.set(0, 0, 0.5) // 将圆形区域放置在球体表面上方
   circle.renderOrder = 1
   scene.add(circle)
   circle.visible = false // 默认隐藏圆形区域
}
function createLights() {
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.025)
   // scene.add(ambientLight)
   const sunlight = new THREE.DirectionalLight(0xffffff, 2)
   const sunlight2 = new THREE.DirectionalLight(0x8f858f, 0.5)
   const sunlight3 = new THREE.DirectionalLight(0x879399, 0.75)

   sunlight.position.set(0, 0.7, 1)
   sunlight2.position.set(1, -0.5, 0)
   sunlight3.position.set(-1, -0.5, 0)

   sunlight.target = camera
   sunlight2.target = camera
   sunlight3.target = camera

   // 将光源添加到相机中
   camera.add(sunlight, sunlight2, sunlight3)
}

function animate() {
   renderer.render(scene, camera)
   requestAnimationFrame(animate)
}
