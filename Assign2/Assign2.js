"use strict";

var canvas;
var gl;
var maxNumVertices = 20000;
var index = 0;
var cindex = 0;
var lwidth = 1;
var mDown = false;

var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0),
    vec4( 1.0, 0.0, 0.0, 1.0),
    vec4( 1.0, 1.0, 0.0, 1.0),
    vec4( 0.0, 1.0, 0.0, 1.0),
    vec4( 0.0, 0.0, 1.0, 1.0),
    vec4( 1.0, 0.0, 1.0, 1.0),
    vec4( 0.0, 1.0, 1.0, 1.0),
];

var t;
var numCurves = 0;
var numIndices = [];
numIndices[0] = 0;
var start = [0];

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL is not available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
    var vPos = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPos);

    var cBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    //
    // Pick color for brush
    //
    var m = document.getElementById("mymenu");
    m.addEventListener("click", function () {
        cindex = m.selectedIndex;
    });

    //
    // Pick width of the line
    //
    var w = document.getElementById("widthmenu");
    w.addEventListener("click", function() {
        lwidth = m.selectedIndex;
    });

    canvas.addEventListener("mouseup", function (event) {

        if (mDown == true) {
            mDown = false;
        }

        numCurves++;
        numIndices[numCurves] = 0;
        start[numCurves] = index;
        render();
    })


    canvas.addEventListener("mousedown", function (event) {
        if (mDown == false) {
            mDown = true;
        }

    });


    canvas.addEventListener("mousemove", function (event) {

        if (mDown == true) {

            t = vec2(2 * event.clientX / canvas.width - 1,
            2 * (canvas.height - event.clientY)/canvas.height - 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(t));

            t = vec4(colors[cindex]);

            gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(t));


            numIndices[numCurves]++;
            index++;

            render();


        }
    })

}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT);

    // This does not seem to work in Windows
    gl.lineWidth(lwidth);
    for (var i = 0; i < numCurves; i++) {

        gl.drawArrays(gl.LINE_STRIP, start[i], numIndices[i]);
    }

    window.requestAnimFrame(render);
}