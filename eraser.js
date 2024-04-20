import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

var scene, camera, width, height, renderer, faceObj

window.addEventListener('load', init)
function init() {
   createScene()
   createLights()
   animate()
   document.addEventListener('click', onDocumentMouseMove)
}

// 创建Raycaster对象
var raycaster = new THREE.Raycaster()
// 创建球体
var geometry = new THREE.SphereGeometry(0.25, 5, 5)
var material = new THREE.MeshBasicMaterial({ color: 0xff0000 })

// 创建一个鼠标向量
const mouse = new THREE.Vector2()

// 鼠标移动事件: choose dot area
// 鼠标点击事件
function onDocumentMouseMove(event) {
   event.preventDefault()

   // 计算鼠标位置
   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

   // 发射射线
   // const raycaster = new THREE.Raycaster()
   raycaster.setFromCamera(mouse, camera)

   // 获取与射线相交的物体
   const intersects = raycaster.intersectObject(faceObj)

   // 选中鼠标位置半径50的所有点
   if (intersects.length > 0) {
      // 在点击处生成一个球体
      var sphere2 = new THREE.Mesh(geometry, material)
      sphere2.position.copy(intersects[0].point)
      // console.log(sphere2.position)
      scene.add(sphere2)

      //check joint points
      const attributes = faceObj.geometry.attributes
      const positions = attributes.position.array
      const normals = attributes.normal.array
      const uvs = attributes.uv.array

      const radius = 10

      const selectedPoints = []
      const selectedNormals = []
      const selectedUvs = []

      const intersect = new THREE.Vector3()
      intersect.copy(intersects[0].point)
      const itemSize = 9
      for (let i = 0; i < positions.length; i += itemSize) {
         let minDistance = 1000
         for (let n = 0; n < 9; n += 3) {
            const x = positions[i + n]
            const y = positions[i + n + 1]
            const z = positions[i + n + 2]
            const distance = Math.sqrt(
               (x - intersect.x) ** 2 +
                  (y - intersect.y) ** 2 +
                  (z - intersect.z) ** 2,
            )
            if (distance < minDistance) minDistance = distance
         }

         if (minDistance < radius) {
            for (let j = 0; j < itemSize; j++) {
               selectedPoints.push(positions[i + j])
               selectedNormals.push(normals[i + j])
            }
            var index = (i / 9) * 6
            for (let j = 0; j < 6; j++) {
               selectedUvs.push(uvs[index + j])
            }
         }
      }

      attributes.position.array = new Float32Array(selectedPoints)
      attributes.position.count = selectedPoints.length / 3

      attributes.normal.array = new Float32Array(selectedNormals)
      attributes.uv.array = new Float32Array(selectedUvs)
      attributes.position.needsUpdate = true
      attributes.normal.needsUpdate = true
      attributes.uv.needsUpdate = true
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   //camera
   camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000)
   camera.position.set(0, 0, 50)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0x000000, 1)
   // renderer.render(scene, camera)
   renderer.setSize(width, height)
   window.addEventListener('resize', handleWindowResize)

   const objLoader = new OBJLoader()
   // objLoader.setMaterials(materials)
   // double side render
   objLoader.load('/face.obj', function (object) {
      const geom = object.children[0].geometry

      const mat = new THREE.PointsMaterial({ color: 0x55ff55, size: 0.1 })
      const points = new THREE.Points(geom, mat)
      // scene.add(points)

      faceObj = object.children[0]
      scene.add(faceObj)

      // const vertices = faceObj.geometry.attributes.position.array
      // console.log(vertices)

      var textureLoader = new THREE.TextureLoader()
      var texture = textureLoader.load('/model.jpg')
      faceObj.material = new THREE.MeshBasicMaterial({
         color: 0xffffff,
         side: THREE.DoubleSide,
         map: texture,
      })

      // // 假设您有一个物体实例名为object
      var matrixWorld = new THREE.Matrix4() // 目标变换矩阵

      // 设置目标变换矩阵的值
      matrixWorld.set(
         1.58493682e1,
         1.23637755e-1,
         -2.60596611,
         -3.08337445e1,
         -2.373569,
         7.34270532,
         -1.40875713e1,
         -1.87617238e2,
         1.0828277,
         1.42855944e1,
         7.26347657,
         1.56165973e2,
         0.0,
         0.0,
         0.0,
         1.0,
      )
      // 将物体应用变换矩阵
      // faceObj.applyMatrix4(matrixWorld)
      // console.log(object.matrixWorld)
   })

   // orbit control
   const controls = new OrbitControls(camera, canvas)
   // controls.enableRotate = false
   controls.enablePan = true
   controls.enableZoom = true

   controls.target.set(0, 0, 0)

   controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
   }

   controls.update()
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
