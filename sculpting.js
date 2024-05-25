import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'dat.gui'
let scene, camera, width, height, renderer, crown, sphere

const material = new THREE.MeshPhongMaterial({
   color: 0xbfc2c2,
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

   // 鼠标移动事件
   let isDragging = false
   document.addEventListener('mousedown', (e) => {
      if (e.button === 0) isDragging = true
   })
   document.addEventListener('mouseup', () => (isDragging = false))
   document.addEventListener('mousemove', (e) => {
      if (isDragging) {
         e.preventDefault()
         sculpting(e, crown)
      }
   })
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
function sculpting(event, object) {
   // event.preventDefault()
   // console.log('draging', event)

   // 计算鼠标位置
   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

   // 发射射线
   // const raycaster = new THREE.Raycaster()
   raycaster.setFromCamera(mouse, camera)

   // 获取与射线相交的物体
   const intersects = raycaster.intersectObject(object)

   // 选中鼠标位置半径50的所有点
   if (intersects.length > 0) {
      const clickedNormal = intersects[0].face.normal
         .clone()
         .applyMatrix4(object.matrixWorld)

      // // 在点击处生成一个球体
      // var sphere2 = new THREE.Mesh(dotGeom, dotMat)
      // sphere2.position.copy(clickedPoint)
      // // console.log(sphere2.position)
      // scene.add(sphere2)

      //check joint points
      const attributes = object.geometry.attributes
      const positions = attributes.position.array
      const normals = attributes.normal.array

      const intersect = new THREE.Vector3()
      intersect.copy(intersects[0].point)
      const itemSize = 3
      for (let i = 0; i < positions.length; i += itemSize) {
         const x = positions[i]
         const y = positions[i + 1]
         const z = positions[i + 2]
         const distance = Math.sqrt(
            (x - intersect.x) ** 2 +
               (y - intersect.y) ** 2 +
               (z - intersect.z) ** 2,
         )
         const vertexNormal = new THREE.Vector3(
            normals[i],
            normals[i + 1],
            normals[i + 2],
         ).normalize()
         if (distance < brushSize && vertexNormal.dot(clickedNormal) > 0.5) {
            let offset
            switch (mode) {
               case 'Add':
                  offset = (Math.exp(-(distance ** 2) / 2) / 50) * strength
                  break
               case 'Remove':
                  offset = -(Math.exp(-(distance ** 2)) / 50) * strength
                  break
               case 'Smooth':
                  offset = 2
                  break
               case 'Flatten':
                  offset = 2
                  break
            }

            for (let j = 0; j < itemSize; j += 3) {
               positions[i + j] += clickedNormal.x * offset
               positions[i + j + 1] += clickedNormal.y * offset
               positions[i + j + 2] += clickedNormal.z * offset
            }
         }
      }

      attributes.position.needsUpdate = true
      object.geometry.computeVertexNormals(true)
   }
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()
   const scaleRatio = 60
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

   camera.position.set(0, 100, 0)
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
   const controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.MIDDLE = 0
   // controls.enableDamping = true

   controls.update()
}
function createGUI() {
   const gui = new dat.GUI()
   const params = {
      mode: 'Add',
      brushSize,
      strength,
   }

   gui.add(params, 'mode', ['Add', 'Remove', 'Smooth', 'Flatten']).onChange(
      () => {
         mode = params.mode
         console.log(mode)
      },
   )
   gui.add(params, 'brushSize', 0, 10, 0.01).onChange(() => {
      brushSize = params.brushSize
   })
   gui.add(params, 'strength', 0, 1, 0.01).onChange(() => {
      strength = params.strength
   })
}
function loadModel() {
   //生成一个球体
   const geometry = new THREE.SphereGeometry(10, 60, 60)
   sphere = new THREE.Mesh(geometry, material)
   // scene.add(sphere)

   // const matcapLoader = new THREE.TextureLoader()
   // const matcapTexture = matcapLoader.load('/matcap2.png')
   // const matcapMaterial = new THREE.MeshMatcapMaterial({
   //    matcap: matcapTexture,
   // })
   //add stl files
   const loader = new STLLoader()
   loader.load('/crown.stl', function (geom) {
      geom.deleteAttribute('normal')
      geom = BufferGeometryUtils.mergeVertices(geom)
      geom.computeVertexNormals(true)
      crown = new THREE.Mesh(geom, material)

      scene.add(crown)
   })
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
