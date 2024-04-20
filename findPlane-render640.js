import * as THREE from 'three'
import * as math from 'mathjs'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'
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

let scene, camera, width, height, renderer
const canvas = document.querySelector('#world')
let lowerJaw, upperJaw
const material = new THREE.MeshPhongMaterial({
   color: 0xbfc2c2,
   side: THREE.DoubleSide,
   shininess: 30,
   specular: 0x333333,
})
// window.addEventListener("load", init)
init()
function init() {
   createScene()
   createLights()
   animate()
   // 监听鼠标点击事件
   document.addEventListener('mousedown', onDocumentMouseDown, false)
}

const greenMat = new THREE.MeshBasicMaterial({
   color: 0x16c2a6,
   side: THREE.DoubleSide,
   transparent: true,
   opacity: 0.5,
})
// icp choose ref dot
function onDocumentMouseDown(event) {
   if (event.button === 1) {
      detectDistance()
   } else if (event.button === 0) {
      // 导出整个场景为 obj 文件
      // exportToOBJ(scene, 'model.obj')\
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()
   const scope = 40
   // camera
   camera = new THREE.OrthographicCamera(
      scope * -1, // 左边界
      scope, // 右边界
      scope, // 上边界
      scope * -1, // 下边界
      0.1, // 近平面距离
      1000, // 远平面距离
   )

   camera.position.set(0, 0, 100)
   scene.add(camera)

   //renderer

   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0x393939, 1)
   renderer.setSize(640, 640)

   loadModel()

   // // 创建一个 AxesHelper 对象
   // const axesHelper = new THREE.AxesHelper(80)

   // // 将 AxesHelper 添加到场景中
   // scene.add(axesHelper)

   // orbit control
   camera.up.set(0, 0, 1)
   const controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.RIGHT = 0
   // controls.enableDamping = true

   controls.update()
}
function loadModel() {
   //add stl files
   const loader = new STLLoader()
   loader.load('/upperJaw_half_rotate.stl', function (geom) {
      //generate merged shape of upperjaw
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals()
      // console.log(geom)
      upperJaw = new THREE.Mesh(geom, material)
      upperJaw.name = 'upperJaw'
      scene.add(upperJaw)
   })

   loader.load('/lowerJaw_half_rotate.stl', function (geom) {
      //generate merged shape of upperjaw
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals()
      geom.computeBoundsTree({
         maxLeafTris: 1,
      })
      // console.log(geom)
      lowerJaw = new THREE.Mesh(geom, material)
      lowerJaw.name = 'lowerJaw'
      scene.add(lowerJaw)

      detectDistance()
   })
}

// 创建Raycaster对象
var raycasterFront = new THREE.Raycaster()
var raycasterBack = new THREE.Raycaster()
const raycastDistance = 1
const validDistance = 1

//检测距离
function detectDistance() {
   const points = []

   // 获取A物体所有顶点
   const positions = upperJaw.geometry.attributes.position.array
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
      vertex.applyMatrix4(upperJaw.matrixWorld)

      // 获取顶点法线
      const normal = new THREE.Vector3()
      normal.fromArray(upperJaw.geometry.attributes.normal.array, i)

      // 创建射线
      raycasterFront = new THREE.Raycaster(vertex, normal, 0, raycastDistance)
      raycasterFront.firstHitOnly = true

      // 检测射线是否与B物体相交
      const intersects = raycasterFront.intersectObject(lowerJaw)

      raycasterBack = new THREE.Raycaster(
         vertex,
         normal.negate(),
         0,
         raycastDistance,
      )
      raycasterBack.firstHitOnly = true

      // 检测射线是否与B物体相交
      const intersects2 = raycasterBack.intersectObject(lowerJaw)
      let closerDirection = ''
      // 如果距离小于distance，则将顶点颜色改为绿色
      if (
         (intersects.length > 0 && intersects[0].distance < validDistance) ||
         (intersects2.length > 0 && intersects2[0].distance < validDistance)
      ) {
         points.push([vertex.x, vertex.y, vertex.z])
      }
   }

   fitPlane(points)
}

function fitPlane(points) {
   // 计算质心
   const centroid = math.mean(points, 0)

   // 构建协方差矩阵
   let cov = math.multiply(
      math.transpose(math.subtract(points, centroid)),
      math.subtract(points, centroid),
   )
   cov = math.divide(cov, points.length)

   // 计算特征向量和特征值
   const values = math.eigs(cov).values
   const vectors = math.eigs(cov).eigenvectors

   const minEigenValueIndex = values.indexOf(math.min(values))
   const normal = vectors[minEigenValueIndex]

   // 计算平面方程的d值
   // const d = -math.dot(normal, centroid)

   // const geometry = new THREE.BufferGeometry()
   // const vertices = new Float32Array([
   //    0,
   //    0,
   //    0,
   //    normal.vector[0] * len,
   //    normal.vector[1] * len,
   //    normal.vector[2] * len,
   // ])
   // geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
   // const line = new THREE.Line(geometry, greenMat)
   // scene.add(line)

   const direction = new THREE.Vector3(
      normal.vector[0],
      normal.vector[1],
      normal.vector[2],
   )
   console.log('direction:', direction)
   // 假设已知平面法向量normal和平面参数D
   const planeGeometry = new THREE.PlaneGeometry(80, 80)
   const planeMesh = new THREE.Mesh(planeGeometry, greenMat)
   // 设置平面位置和朝向

   planeMesh.lookAt(direction)

   planeMesh.position.set(centroid[0], centroid[1], centroid[2])
   planeMesh.updateMatrixWorld()
   const inverseMatrix = new THREE.Matrix4()
   inverseMatrix.copy(planeMesh.matrix).invert()

   upperJaw.applyMatrix4(inverseMatrix)
   lowerJaw.applyMatrix4(inverseMatrix)
   planeMesh.applyMatrix4(inverseMatrix)
   planeMesh.name = 'plane'
   // line.applyMatrix4(inverseMatrix)
   // scene.add(planeMesh)
   centerTeeth()
}

function centerTeeth() {
   const parent = new THREE.Object3D()
   parent.add(upperJaw)
   parent.add(lowerJaw)
   scene.add(parent)
   const box = new THREE.Box3().setFromObject(parent)
   const center = new THREE.Vector3()
   box.getCenter(center)
   console.log(center)
   const centerXY = new THREE.Vector3(center.x, center.y, 0)
   parent.position.sub(centerXY)
   // lowerJaw.position.sub(centerXY)
}

function exportToOBJ(object, filename) {
   const exporter = new OBJExporter()
   const objData = exporter.parse(object)

   const link = document.createElement('a')
   link.style.display = 'none'
   document.body.appendChild(link)

   const blob = new Blob([objData], { type: 'text/plain' })
   const url = URL.createObjectURL(blob)
   link.href = url
   link.download = filename
   link.click()

   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

function createLights() {
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)

   const sunlight = new THREE.DirectionalLight(0xffffff, 2.5)
   sunlight.position.set(-0.42, 0.42, 1-100)

   const sunlight2 = new THREE.DirectionalLight(0x5c5249, 2.5)
   sunlight2.position.set(1.5, -1.5, -1-100)

   const sunlight3 = new THREE.DirectionalLight(0x5c636f, 0.3)
   sunlight3.position.set(0.75, 1, 0.3-100)
   scene.add(ambientLight)
   camera.add(sunlight, sunlight2, sunlight3)
}

function animate() {
   renderer.render(scene, camera)
   requestAnimationFrame(animate)
}
