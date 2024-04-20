// raycastingWorker.js

importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
)

self.onmessage = function (e) {
    // const { verticesA, objectB } = e.data

    // 执行射线与物体相交的计算任务
    // const intersections = calculateIntersections(verticesA, objectB)

    // 将计算结果发送回主线程
    self.postMessage('hand success')
}

function calculateIntersections(verticesA, objectB) {
    const intersections = []

    // 获取Three.js中的射线和物体B
    const raycaster = new THREE.Raycaster()
    const bMesh = objectB.children[0] // 假设b物体是一个Mesh

    // 遍历a物体的每一个顶点，发射射线并检测与b物体的相交情况
    for (let i = 0; i < verticesA.length; i += 3) {
        const vertex = new THREE.Vector3(
            verticesA[i],
            verticesA[i + 1],
            verticesA[i + 2],
        )
        raycaster.set(vertex, new THREE.Vector3(0, 0, -1)) // 假设射线方向为z轴负方向
        const intersects = raycaster.intersectObject(bMesh)
        intersections.push(intersects.length > 0)
    }

    return intersections
}
