import * as THREE from 'three'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

var scene, camera, width, height, renderer
const material = new THREE.MeshStandardMaterial({
   color: 0xffffff,
   vertexColors: true,
   side: THREE.DoubleSide,
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
   camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)
   camera.position.set(0, -800, 0)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0xffffff, 1)
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
   const loader = new PLYLoader()
   loader.load('/upperJaw.ply', function (geom) {
      geom.computeVertexNormals()
      const mesh = new THREE.Mesh(geom, material)
      scene.add(mesh)
      console.log(mesh)
   })

   // loader.load('/lowerJaw.ply', function (geom) {
   //    geom.computeVertexNormals()
   //    const mesh = new THREE.Mesh(geom, material)
   //    scene.add(mesh)
   // })
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
