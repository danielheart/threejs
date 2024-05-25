import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

var scene, camera, width, height, renderer
const material = new THREE.MeshPhongMaterial({
   color: 0xffffff,
   side: THREE.DoubleSide,
   shininess: 300,
})
window.addEventListener('load', init)
function init() {
   createScene()
   loadModel()
   createLights()
   animate()
}

function createScene() {
   width = window.innerWidth
   height = window.innerHeight
   scene = new THREE.Scene()

   //camera
   camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000)
   camera.position.set(600, -800, 100)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0xf2f7f6, 1)
   // renderer.render(scene, camera)
   renderer.setSize(width, height)
   window.addEventListener('resize', handleWindowResize)

   // orbit control
   camera.up.set(0, 0, 1)
   const controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.MIDDLE = 0
   // controls.enableDamping = true

   controls.update()
}
function loadModel() {
   //add stl files
   const loader = new STLLoader()
   loader.load('/upperJaw.stl', function (geom) {
      const mesh = new THREE.Mesh(geom, material)
      scene.add(mesh)
   })

   loader.load('/lowerJaw.stl', function (geom) {
      const mesh = new THREE.Mesh(geom, material)
      scene.add(mesh)
   })
   const files = [
      'ref-mid.stl',
      '/ref-surface.stl',
      '/ref-plane1.stl',
      '/ref-plane2.stl',
      '/ref-plane3.stl',
   ]
   files.forEach((file) => {
      loader.load(file, function (geom) {
         const mat = new THREE.MeshPhongMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,

            transparent: true, // 将材质设为半透明
            opacity: 0.15, // 设置透明度值
         })
         // 创建半透明材质

         const mesh = new THREE.Mesh(geom, mat)
         scene.add(mesh)

         // 创建边框几何体
         const edges = new THREE.EdgesGeometry(geom)
         const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true, // 将材质设为半透明
            opacity: 0.15, // 设置透明度值
         })

         // 创建边框网格并添加到场景中
         const lineSegments = new THREE.LineSegments(edges, lineMaterial)
         mesh.add(lineSegments)
      })
   })

   const objLoader = new OBJLoader()
   // double side render
   objLoader.load('/faceScan.obj', function (object) {
      const faceObj = object.children[0]
      scene.add(faceObj)

      var textureLoader = new THREE.TextureLoader()
      var texture = textureLoader.load('/smile.png')

      texture.colorSpace = THREE.SRGBColorSpace

      faceObj.material = new THREE.MeshBasicMaterial({
         side: THREE.DoubleSide,
         map: texture,
      })
   })
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
