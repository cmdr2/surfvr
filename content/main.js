var gl, glCanvas, leftBuffer, rightBuffer, leftBufferCtx, rightBufferCtx,
    backpage, leftTexture, rightTexture, stats, cssQuat = null;

window.addEventListener("load", function() {
    try {
        stats = new Stats();
        stats.setMode(0);

        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.getElementById('stats').appendChild(stats.domElement);


        // dom stuff
        leftBuffer = document.getElementById('leftBuffer');
        rightBuffer = document.getElementById('rightBuffer');

        glCanvas = document.getElementById('glCanvas');
        gl = glCanvas.getContext("experimental-webgl") || glCanvas.getContext("webgl");

        leftBufferCtx = leftBuffer.getContext('2d');
        rightBufferCtx = rightBuffer.getContext('2d');
        
        backpage = document.getElementById('backpage');


        // shader stuff
        var vs = document.getElementById('vshader').textContent;
        var fs = document.getElementById('fshader').textContent;
        var program = createProgram(gl, vs,fs);
        gl.useProgram(program);

        var positionLocation = gl.getAttribLocation(program, "a_position");
        var texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
        var leftEyeTexture = gl.getUniformLocation(program, 'left_eye_texture');
        var rightEyeTexture = gl.getUniformLocation(program, 'right_eye_texture');


        // provide texture coordinates for the rectangle.
        var texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            0.0,  1.0,
            1.0,  0.0,
            1.0,  1.0]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        

        // Create a buffer for the position of the rectangle corners.
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);


        // set the resolution
        var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionLocation, 1440, 800);
        gl.uniform1i(leftEyeTexture, 0);
        gl.uniform1i(rightEyeTexture, 1);


        // Set a rectangle the same size as the image.
        setRectangle(gl, 0, 0, 1440, 800);


        // render textures
        leftTexture = gl.createTexture();
        rightTexture = gl.createTexture();

        initHMD();
        initMouse();

        requestAnimationFrame(function() {
            render(EYE_LEFT);
        });
    } catch (e) {
        alert(e);
    }
});

/*
notes on drawWindow performance:
1. the size of the render rectangle doesn't seem to have a direct linear impact on latency
2. position of the render rectangle seems to have a direct linear impact on latency
3. existence of DOM elements in the render rectangle has no impact on latency

*/

var EYE_LEFT = -1, EYE_RIGHT = 1;

function render(eye) {
    stats.begin();
    try {
        if (eye === EYE_LEFT) {
            // 1. <strike>TODO</strike> there's a bug where drawWindow() incorrectly renders a
            //        rotateY(180deg) mirror of all elements whereas that isn't rendered in the source iframe.
            //        I've tried all gecko flags to force pixel-correct rendering in drawWindow(), but to no avail.
            //    EDIT: This is not reproducible in Nightly 34.0a1

            // 2. TODO there's a bug where the 360 rotation gets covered in half time when going clockwise, while it is
            //       fine when going anti-clockwise
            //    EDIT: This goes away when I remove my Y-rotation calibration code

            // 3. TODO there's a bug where I see double beyond 500px from camera

            // 4. TODO there's a bug when objects elongated along the Z axis appear to cross each other (like an X) in
            //       the rendering of the two eyes. This is a blocker for Mario

            // 5. TODO there's a bug where I see double before 400px from camera. Probably related to #3 and #4
            setTimeout(function() {
                leftBufferCtx.drawWindow(backpage.contentWindow, 0, 0, 720, 800, "rgb(255, 255, 255)");

                // now send the signal to begin rendering the other eye
                backpage.contentWindow.postMessage({
                    type: 'render',
                    eye: EYE_RIGHT,
                    orientationMatrix: (cssQuat ? cssMatrixFromOrientation(cssQuat, true) : '')
                }, '*');

                /* gl stuff */
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, leftTexture);

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, leftBuffer);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

                // requestAnimationFrame(function() {
                // setTimeout(function() {
                    stats.end();
                    render(-eye);
                // }, 0);
            }, 2);
        } else if (eye === EYE_RIGHT) {
            setTimeout(function() {
                rightBufferCtx.drawWindow(backpage.contentWindow, 0, 0, 720, 800, "rgb(255, 255, 255)");

                // now send the signal to begin rendering the other eye
                backpage.contentWindow.postMessage({
                    type: 'render',
                    eye: EYE_LEFT,
                    orientationMatrix: (cssQuat ? cssMatrixFromOrientation(cssQuat, true) : '')
                }, '*');

                /* gl stuff */
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, rightTexture);

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rightBuffer);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

                // requestAnimationFrame(function() {
                // setTimeout(function() {
                    stats.end();
                    render(-eye);
                // }, 0);
            }, 2);
        }
    } catch (e) {
        alert(e);
    }
}

function createShader(gl, str, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(shader);
    }
    return shader;
}

function createProgram(gl, vstr, fstr) {
    var program = gl.createProgram();
    var vshader = createShader(gl, vstr, gl.VERTEX_SHADER);
    var fshader = createShader(gl, fstr, gl.FRAGMENT_SHADER);
    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(program);
    }
    return program;
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2]), gl.STATIC_DRAW);
}


/* mouse and keyboard */
function initMouse() {
    document.addEventListener('mousemove', function(e) {
        backpage.contentWindow.postMessage({
            type: 'mouseEvent',
            x: parseInt(e.clientX / 2),
            y: e.clientY
        }, '*');
    });
}


/* HMD stuff */

function initHMD() {
    oculusBridge = new OculusBridge({
        onOrientationUpdate  : bridgeOrientationUpdated,
        onAccelerationUpdate : bridgeAccelerationUpdated,
        onConfigUpdate       : bridgeConfigUpdated,
        onConnect            : bridgeConnected,
        onDisconnect         : bridgeDisconnected
    });

    oculusBridge.connect();
}

function rtod(r) {
    return r*180/Math.PI;
}

// source: people.mozilla.org/~vladimir/vr/simple-css-2.html
// helper function to convert a quaternion into a matrix, optionally
// inverting the quaternion along the way
var origY = 0, calibrated = false;

function matrixFromOrientation(q, inverse) {
  var m = Array(16);

  var x = -q.x, y = q.y, z = -q.z, w = q.w;

  // if (calibrated) {
  //   y = y - origY;
  // } else {
  //   origY = y;
  //   y = 0;
  //   calibrated = true;
  // }

  // if inverse is given, invert the quaternion first
  if (inverse) {
    x = -x; y = -y; z = -z;
    var l = Math.sqrt(x*x + y*y + z*z + w*w);
    if (l == 0) {
      x = y = z = 0;
      w = 1;
    } else {
      l = 1/l;
      x *= l; y *= l; z *= l; w *= l;
    }
  }

  var x2 = x + x, y2 = y + y, z2 = z + z;
  var xx = x * x2, xy = x * y2, xz = x * z2;
  var yy = y * y2, yz = y * z2, zz = z * z2;
  var wx = w * x2, wy = w * y2, wz = w * z2;

  m[0] = 1 - (yy + zz);
  m[4] = xy - wz;
  m[8] = xz + wy;

  m[1] = xy + wz;
  m[5] = 1 - (xx + zz);
  m[9] = yz - wx;

  m[2] = xz - wy;
  m[6] = yz + wx;
  m[10] = 1 - (xx + yy);

  m[3] = m[7] = m[11] = 0;
  m[12] = m[13] = m[14] = 0;
  m[15] = 1;

  return m;
}

function cssMatrixFromElements(e) {
  return "matrix3d(" + e.join(",") + ")";
}

function cssMatrixFromOrientation(q, inverse) {
  return cssMatrixFromElements(matrixFromOrientation(q, inverse));
}

var camera = {};
camera.rotation = {x: 0, y: 0, z: 0};
camera.hmdOffset = {x: 0, y: 0, z: 0};
function bridgeOrientationUpdated(quat) {
    cssQuat = quat;
}

function bridgeAccelerationUpdated(accel) {}

function bridgeConfigUpdated(config) {

}

function bridgeConnected() {

}

function bridgeDisconnected() {
}
