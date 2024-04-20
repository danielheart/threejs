import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

let scene, camera, width, height, renderer, transformControls

// window.addEventListener("load", init)
init()
function init() {
   createScene()
   createLights()
   animate()
   // 监听鼠标点击事件
   document.addEventListener('mousedown', onDocumentMouseDown, false)
}

// 创建一个鼠标向量
const mouse = new THREE.Vector2()

let abutment
const polarNumber = 10
const azimuthalNumber = 10
const greenMat = new THREE.MeshBasicMaterial({ color: 0x16c2a6 })
const len = 10
// icp choose ref dot
function onDocumentMouseDown(event) {
   if (event.button === 1) {
      // apply(abutment)
      const directions = []
      const numbers = []
      const startTime = performance.now()
      directions.push(new THREE.Vector3(0, 0, 1))
      for (let i = 1; i < polarNumber; i++)
         for (let j = 0; j < azimuthalNumber; j++) {
            const polarAngle = (Math.PI / 4) * (i / polarNumber) // 均匀分布的极角
            const azimuthalAngle = 2 * Math.PI * (j / azimuthalNumber) // 均匀分布的方位角

            const x = Math.sin(polarAngle) * Math.cos(azimuthalAngle)
            const y = Math.sin(polarAngle) * Math.sin(azimuthalAngle)
            const z = Math.cos(polarAngle)
            directions.push(new THREE.Vector3(x, y, z))
         }

      for (const direction of directions) {
         numbers.push(detectNumber(direction))
      }
      const endTime = performance.now()
      // 计算执行时间（以毫秒为单位）
      const executionTime = endTime - startTime
      // 输出执行时间
      console.log(`代码执行时间：${executionTime.toFixed(0)} 毫秒`)
      // 找到最小值
      const minValue = Math.min(...numbers)

      // 找到最小值的索引
      const minIndex = numbers.indexOf(minValue)
      const rightDirection = directions[minIndex]
      console.log(
         'right direction is:',
         rightDirection,
         'minValue is:',
         minValue,
      )

      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array([
         0,
         0,
         0,
         rightDirection.x * len,
         rightDirection.y * len,
         rightDirection.z * len,
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      const line = new THREE.Line(geometry, greenMat)

      scene.add(line)
      console.log(numbers)
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   //camera
   camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)

   camera.position.set(100, 0, 0)
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

   transformControls = new TransformControls(camera, canvas)
   // 设置变换模式为旋转
   transformControls.setMode('rotate')
   transformControls.position.x = -100

   //add stl files
   const loader = new STLLoader()
   loader.load('/abutment.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xffffff,
         side: THREE.DoubleSide,
         shininess: 500,
      })
      //generate merged shape of upperjaw
      let geom = geometry.clone()
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals()
      abutment = new THREE.Mesh(geom, material)
      abutment.geometry.computeBoundsTree({
         maxLeafTris: 1,
      })
      transformControls.attach(abutment)
      scene.add(abutment, transformControls)
   })

   // orbit control
   camera.up.set(0, 0, 1)
   const controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.RIGHT = 0
   // controls.enableDamping = true

   controls.update()
}
let raycaster = new THREE.Raycaster()
const raycastDistance = 12
function detectNumber(direction) {
   let joinNumber = 0
   const positions = abutment.geometry.attributes.position.array

   // 循环所有顶点
   const itemSize = 3
   for (let i = 0; i < positions.length; i += itemSize) {
      // 获取当前顶点
      const vertex = new THREE.Vector3(
         positions[i],
         positions[i + 1],
         positions[i + 2],
      )

      // 将顶点坐标转换为世界坐标
      vertex.applyMatrix4(abutment.matrixWorld)

      // 创建射线
      raycaster = new THREE.Raycaster(vertex, direction, 0.1, raycastDistance)
      // raycaster.firstHitOnly = true

      // 检测射线是否与B物体相交
      const intersects = raycaster.intersectObject(abutment)

      if (intersects.length > 0) joinNumber++
   }
   // console.log(joinNumber)
   return joinNumber * (itemSize / 3)
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
