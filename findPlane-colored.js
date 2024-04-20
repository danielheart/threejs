import * as THREE from 'three'
import * as math from 'mathjs'
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

let scene, camera, width, height, renderer

// window.addEventListener("load", init)
init()
function init() {
   createScene()
   createLights()
   animate()
   // 监听鼠标点击事件
   document.addEventListener('mousedown', onDocumentMouseDown, false)
}

let lowerJaw, upperJaw
const greenMat = new THREE.MeshBasicMaterial({
   color: 0x16c2a6,
   side: THREE.DoubleSide,
   transparent: true,
   opacity: 0.5,
})
const len = 40
// icp choose ref dot
function onDocumentMouseDown(event) {
   if (event.button === 1) {
      detectDistance()
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   // camera
   // camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)
   camera = new THREE.OrthographicCamera(
      width / -16, // 左边界
      width / 16, // 右边界
      height / 16, // 上边界
      height / -16, // 下边界
      1, // 近平面距离
      1000, // 远平面距离
   )

   camera.position.set(0, 0, 200)
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

   loadModel()

   // 创建一个 AxesHelper 对象
   const axesHelper = new THREE.AxesHelper(80)

   // 将 AxesHelper 添加到场景中
   scene.add(axesHelper)

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
   // uppderjaw
   loader.load('/low.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xfffffa,
         side: THREE.DoubleSide,
         shininess: 1000,
      })

      //generate merged shape of upperjaw
      let geom = geometry.clone()
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals()
      // console.log(geom)
      upperJaw = new THREE.Mesh(geom, material)
      scene.add(upperJaw)
   })

   loader.load('/up.stl', function (geometry) {
      const material = new THREE.MeshPhongMaterial({
         color: 0xfffffa,
         side: THREE.DoubleSide,
         shininess: 1000,
      })
      //generate merged shape of upperjaw
      let geom = geometry.clone()
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals()
      geom.computeBoundsTree({
         maxLeafTris: 1,
      })
      // console.log(geom)
      lowerJaw = new THREE.Mesh(geom, material)
      scene.add(lowerJaw)
   })
}
function apply(object) {
   object.updateMatrix()
   // object.updateMatrixWorld(true)
   console.log(object.matrix)
   object.geometry.applyMatrix4(object.matrix)
   object.position.set(0, 0, 0)
   object.rotation.set(0, 0, 0)
   // object.scale.set(1, 1, 1)
   object.updateMatrix()
}

// 创建Raycaster对象
var raycasterFront = new THREE.Raycaster()
var raycasterBack = new THREE.Raycaster()
const raycastDistance = 10
const validDistance = 1
const validcolors = [0, 1, 0]
const vertexMat = new THREE.MeshPhongMaterial({
   side: THREE.DoubleSide,
   vertexColors: true,
})
//检测距离
function detectDistance() {
   const points = []
   for (let objectDetect of [upperJaw]) {
      // 获取A物体所有顶点
      var colors = []
      // console.log(objectDetect)
      const positions = objectDetect.geometry.attributes.position.array
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
         vertex.applyMatrix4(objectDetect.matrixWorld)

         // 获取顶点法线
         const normal = new THREE.Vector3()
         normal.fromArray(objectDetect.geometry.attributes.normal.array, i)

         // 创建射线
         raycasterFront = new THREE.Raycaster(
            vertex,
            normal,
            0,
            raycastDistance,
         )
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
         if (intersects.length > 0 && intersects2.length) {
            if (intersects[0].distance < intersects2[0].distance) {
               closerDirection = 'front'
            } else {
               closerDirection = 'back'
            }
         }

         if (intersects.length > 0 || closerDirection == 'front') {
            if (intersects[0].distance < validDistance) {
               for (let i = 0; i < itemSize / 3; i++) {
                  // points.push(vertex)
                  points.push([vertex.x, vertex.y, vertex.z])
                  colors.push(...validcolors)
               }
            } else {
               const v = 1 - intersects[0].distance / raycastDistance
               for (let i = 0; i < itemSize / 3; i++) {
                  colors.push(0, 0, v)
               }
            }
         } else if (intersects2.length > 0 || closerDirection == 'back') {
            if (intersects2[0].distance < validDistance) {
               for (let i = 0; i < itemSize / 3; i++) {
                  // points.push(vertex)
                  points.push([vertex.x, vertex.y, vertex.z])

                  colors.push(...validcolors)
               }
            } else {
               const v = 1 - intersects2[0].distance / raycastDistance
               for (let i = 0; i < itemSize / 3; i++) {
                  colors.push(v, v, 0)
               }
            }
         } else {
            for (let i = 0; i < itemSize; i++) {
               colors.push(1)
            }
         }
      }
      objectDetect.geometry.setAttribute(
         'color',
         new THREE.Float32BufferAttribute(colors, 3),
      )
      if (objectDetect.material.type !== 'MeshBasicMaterial') {
         objectDetect.material = vertexMat
         objectDetect.renderOrder = 1000
      }

      // 更新顶点颜色
      objectDetect.geometry.attributes.color.needsUpdate = true

      fitPlane(points)
      // scene.add(objectDetect)
   }
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

   const geometry = new THREE.BufferGeometry()
   const vertices = new Float32Array([
      0,
      0,
      0,
      normal.vector[0] * len,
      normal.vector[1] * len,
      normal.vector[2] * len,
   ])
   geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
   const line = new THREE.Line(geometry, greenMat)

   scene.add(line)
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
   line.position.set(centroid[0], centroid[1], centroid[2])
   // planeMesh.position.set(
   //    centroid[0] * normal.vector[0],
   //    centroid[1] * normal.vector[1],
   //    centroid[2] * normal.vector[2],
   // )
   // line.position.set(
   //    centroid[0] * normal.vector[0],
   //    centroid[1] * normal.vector[1],
   //    centroid[2] * normal.vector[2],
   // )
   planeMesh.updateMatrixWorld()
   const inverseMatrix = new THREE.Matrix4()
   inverseMatrix.copy(planeMesh.matrix).invert()

   upperJaw.applyMatrix4(inverseMatrix)
   lowerJaw.applyMatrix4(inverseMatrix)
   planeMesh.applyMatrix4(inverseMatrix)
   line.applyMatrix4(inverseMatrix)
   scene.add(planeMesh)
   console.log(planeMesh.matrix)
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
