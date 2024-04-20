// 获取A物体所有顶点
var colors = []
// console.log(objectDetect)
const positions = objectDetect.geometry.attributes.position.array
// 循环所有顶点
const itemSize = 9
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
    raycasterFront = new THREE.Raycaster(vertex, normal, 0, raycastDistance)
    raycasterFront.firstHitOnly = true

    // 检测射线是否与B物体相交
    const intersects = raycasterFront.intersectObject(faceObj)

    raycasterBack = new THREE.Raycaster(
        vertex,
        normal.negate(),
        0,
        raycastDistance,
    )
    raycasterBack.firstHitOnly = true

    // 检测射线是否与B物体相交
    const intersects2 = raycasterBack.intersectObject(faceObj)
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
            colors.push(...validcolors)
            colors.push(...validcolors)
            colors.push(...validcolors)
        } else {
            const v = 1 - intersects[0].distance / raycastDistance
            colors.push(0, 0, v, 0, 0, v, 0, 0, v)
        }
    } else if (intersects2.length > 0 || closerDirection == 'back') {
        if (intersects2[0].distance < validDistance) {
            colors.push(...validcolors)
            colors.push(...validcolors)
            colors.push(...validcolors)
        } else {
            const v = 1 - intersects2[0].distance / raycastDistance
            colors.push(v, v, 0, v, v, 0, v, v, 0)
        }
    } else {
        colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1)
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

scenes[0].add(objectDetect)
