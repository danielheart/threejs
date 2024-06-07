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

let upperJaw
const polarNumber = 10
const azimuthalNumber = 10
const greenMat = new THREE.MeshBasicMaterial({
   color: 0x16c2a6,
   depthTest: false,
})
const len = 10
// icp choose ref dot
function onDocumentMouseDown(event) {
   if (event.button === 1) {
      // apply(upperJaw)
      const directions = []
      const numbers = []
      const startTime = performance.now()
      directions.push(new THREE.Vector3(0, 0, 1))
      for (let i = 1; i < polarNumber; i++)
         for (let j = 0; j < azimuthalNumber; j++) {
            const polarAngle = (Math.PI / 3) * (i / polarNumber) // 均匀分布的极角
            const azimuthalAngle = 2 * Math.PI * (j / azimuthalNumber) // 均匀分布的方位角

            const x = Math.sin(polarAngle) * Math.cos(azimuthalAngle)
            const y = Math.sin(polarAngle) * Math.sin(azimuthalAngle)
            const z = Math.cos(polarAngle)
            directions.push(new THREE.Vector3(x, y, z))
         }

      for (const direction of directions) {
         numbers.push(detectNumber(direction.clone().negate()))
      }
      const endTime = performance.now()
      // 计算执行时间（以毫秒为单位）
      const executionTime = endTime - startTime
      // 输出执行时间
      console.log(`代码执行时间：${executionTime.toFixed(0)} 毫秒`)
      // 找到最小值
      const maxValue = Math.min(...numbers)

      // 找到最小值的索引
      const maxIndex = numbers.indexOf(maxValue)
      const rightDirection = directions[maxIndex]
      console.log(
         'right direction is:',
         rightDirection,
         'minValue is:',
         maxValue,
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
      line.renderOrder = 2
      // console.log(numbers)
      // 创建平面网格
      const planeGeometry = new THREE.PlaneGeometry(80, 80)
      const material = new THREE.MeshPhongMaterial({
         color: 0x16c2a6,
         side: THREE.DoubleSide,

         transparent: true,
         opacity: 0.3,
         // wireframe: true,
      })
      const planeMesh = new THREE.Mesh(planeGeometry, material)
      // 设置平面位置和朝向

      planeMesh.lookAt(rightDirection)

      scene.add(planeMesh)
   }
}

function detectNumber(direction) {
   let joinNumber = 0
   const normals = upperJaw.geometry.attributes.normal.array
   const indices = upperJaw.geometry.index.array

   // 循环所有面
   // for (let i = 0; i < indices.length; i++) {
   //    const normal = new THREE.Vector3(
   //       normals[indices[i] * 3],
   //       normals[indices[i] * 3 + 1],
   //       normals[indices[i] * 3 + 2],
   //    )
   //    const angle = normal.dot(direction)
   //    if (angle > 0) joinNumber += angle
   // }
   for (let i = 0; i < normals.length; i += 3) {
      const normal = new THREE.Vector3(
         normals[i],
         normals[i + 1],
         normals[i + 2],
      )
      const angle = normal.dot(direction)
      if (angle < 0) joinNumber += -angle
   }

   return joinNumber
}
function createNormalHelper(geometry) {
   const normalLength = 0.1 // 法线向量的长度
   const normalColor = [0.15, 0.4, 1] // 法线向量的颜色

   const normalGeometry = new THREE.BufferGeometry()
   const normalVertices = []
   const normalColors = []

   const positions = geometry.attributes.position.array
   const normals = geometry.attributes.normal.array

   for (let i = 0; i < positions.length; i += 3) {
      normalVertices.push(
         positions[i],
         positions[i + 1],
         positions[i + 2],
         positions[i] + normals[i] * normalLength,
         positions[i + 1] + normals[i + 1] * normalLength,
         positions[i + 2] + normals[i + 2] * normalLength,
      )

      normalColors.push(...normalColor, ...normalColor)
   }

   normalGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(normalVertices), 3),
   )
   normalGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(normalColors), 3),
   )

   return new THREE.LineSegments(
      normalGeometry,
      new THREE.LineBasicMaterial({
         vertexColors: true,
         transparent: true,
         opacity: 0.7,
      }),
   )
}
function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   //camera
   camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)

   camera.position.set(200, 0, 0)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0x393939, 1)
   // renderer.render(scene, camera)
   renderer.setSize(width, height)
   window.addEventListener('resize', handleWindowResize)

   transformControls = new TransformControls(camera, canvas)
   // 设置变换模式为旋转
   transformControls.setMode('rotate')
   transformControls.position.x = -100

   //add stl files
   const loader = new STLLoader()
   loader.load('/upperJaw2.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xece5b8,
         // side: THREE.DoubleSide,
         shininess: 30,
         specular: 0x333333,
         // wireframe: true,
      })
      //generate merged shape of upperjaw

      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()
      console.log(geometry)
      upperJaw = new THREE.Mesh(geometry, material)
      upperJaw.geometry.computeBoundsTree({
         maxLeafTris: 1,
      })
      // transformControls.attach(upperJaw)
      scene.add(upperJaw)
      // const normalHelper = createNormalHelper(geometry)
      // scene.add(normalHelper)
   })

   // orbit control
   camera.up.set(0, 0, 1)
   const controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.RIGHT = 0
   // controls.enableDamping = true

   controls.update()
}

function createLights() {
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
   scene.add(ambientLight)
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
