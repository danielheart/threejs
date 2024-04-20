import numpy as np


def execute(self, context):
    # copy T0 transformations
    movingMatrixData = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ]
    movingMatrix = np.array(movingMatrixData)
    transformationRoughT0 = np.array(movingMatrixData)
    # build landmark matrix
    fixedData = [
        [-1.3250081, -3.52533819, -13.7267711],
        [-0.56369026, -3.54527398, -13.56961316],
        [0.30420336, -3.47438787, -13.84549741],
        [0.95994474, -3.31203334, -14.35322514]
    ]

    movingData = [
        [-16.66160721, -16.6038179, 4.59909296],
        [-4.39206204, -21.38370859, 6.35449662],
        [9.48200047, -19.29999022, 6.46031809],
        [21.24307905, -11.65586173, 5.53033752]
    ]

    fixedArray = np.array(fixedData)
    movingArray = np.array(movingData)

    # calculate centroids
    fixedCentroid = np.mean(fixedArray, axis=0)
    movingCentroid = np.mean(movingArray, axis=0)

    # move arrays to origin
    fixedOrigin = fixedArray - fixedCentroid
    movingOrigin = movingArray - movingCentroid

    # calculate sum of squares
    fixedSumSquared = np.sum(fixedOrigin ** 2)
    movingSumSquared = np.sum(movingOrigin ** 2)

    # normalize arrays
    fixedNormalized = np.sqrt(fixedSumSquared)
    fixedNormOrigin = fixedOrigin / fixedNormalized
    movingNormalized = np.sqrt(movingSumSquared)
    movingNormOrigin = movingOrigin / movingNormalized

    # singular value decomposition
    covMatrix = np.matrix.transpose(movingNormOrigin) @ fixedNormOrigin
    U, s, Vt = np.linalg.svd(covMatrix)
    V = Vt.T
    rotation3x3 = V @ U.T

    # prevent reflection
    if np.linalg.det(rotation3x3) < 0:
        V[:, -1] *= -1
        s[-1] *= -1
        rotation3x3 = V @ U.T

    # scaling
    scalingFactor = np.sum(s) * fixedNormalized / movingNormalized
    scalingMatrix = np.eye(4)
    for i in range(3):
        scalingMatrix[i, i] *= scalingFactor
    normMatrix = np.eye(4)
    normMatrix[0:3, 3] = -np.matrix.transpose(movingCentroid)
    movingMatrix = normMatrix @ movingMatrix
    movingMatrix = scalingMatrix @ movingMatrix
    normMatrix[0:3, 3] = -normMatrix[0:3, 3]
    movingMatrix = normMatrix @ movingMatrix

    # rotation
    rotationMatrix = np.eye(4)
    rotationMatrix[0:3, 0:3] = rotation3x3
    movingMatrix = rotationMatrix @ movingMatrix

    # translation
    translationMatrix = np.eye(4)
    translationMatrix[0:3, 3] = np.matrix.transpose(
        fixedCentroid - rotation3x3 @ movingCentroid)
    movingMatrix = translationMatrix @ movingMatrix

    # compute transformation matrix
    transformationRough = movingMatrix @ np.linalg.inv(
        transformationRoughT0)
    print("transformationRough:")
    print(transformationRough)
    return {'FINISHED'}


execute(None, None)
