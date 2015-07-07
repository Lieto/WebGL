// Init attributes

// Array to hold vertice points
var points = [];

// Number of subdivisions, init to zero
var NumTimesToSubdivide = 0;

// Angle to swirl, init to zero (no rotation)
var angle = 0;

var primitive = "triangle";

// Scaling factor to scale contribution of distance from origo
var scale =  1/Math.sqrt(0.5);

// OpenGL and canvas
var gl, canvas;

// Array for vertices to hold initial primitive
var vertices;
var v1, v2, v3, v4, v5;

// Coordinates for pentagram
var c1 = Math.cos(2*Math.PI/5);
var c2 = Math.cos(Math.PI/5);
var s1 = Math.sin(2*Math.PI/5);
var s2 = Math.sin(4*Math.PI/5);

// Init when window is loaded
window.onload = init;


function init() {
	canvas = document.getElementById("canvas");
	
	gl = WebGLUtils.setupWebGL(canvas);
	
	
	if (!gl) { alert("WebGL is not available"); }
	
	/* Init primitive */
	initVertices();

	/* Tesselate primitive using divieTriangle */
	dividePrimitive();

	
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	
	var program = initShaders( gl, "vertex-shader", "fragment-shader");
	gl.useProgram( program );
	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation( program, "vPosition");
	gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray( vPosition);

	render();
};

/* dividePrimitive uses divideTriangle. Other geometric objects are constructed from triangles,
so basically we make division on all triangles */
function dividePrimitive() {
	if (primitive == "triangle") {
		divideTriangle( vertices[0], vertices[1], vertices[2], NumTimesToSubdivide);
	}
	else if (primitive == "square") {
		divideTriangle(v1[0], v1[1],v1[2], NumTimesToSubdivide);
		divideTriangle(v2[0], v2[1],v2[2], NumTimesToSubdivide);
		divideTriangle(v3[0], v3[1],v3[2], NumTimesToSubdivide);
		divideTriangle(v4[0], v4[1],v4[2], NumTimesToSubdivide);
		
	}
	else if (primitive == "pentagon") {
		divideTriangle(v1[0], v1[1],v1[2], NumTimesToSubdivide);
		divideTriangle(v2[0], v2[1],v2[2], NumTimesToSubdivide);
		divideTriangle(v3[0], v3[1],v3[2], NumTimesToSubdivide);
		divideTriangle(v4[0], v4[1],v4[2], NumTimesToSubdivide);
		divideTriangle(v5[0], v5[1],v5[2], NumTimesToSubdivide);
		
	}
}

/* initVertices creates vertices based on geometry object */
function initVertices() {
	if (primitive == "triangle") {
		vertices = [
			vec2(-0.5, -0.5),
			vec2(0, 0.5),
			vec2(0.5, -0.5)
		];
	}
	// Compose square from 4 triangles
	else if (primitive == "square") {
		v1 = [
			vec2(-0.5, -0.5),
			vec2(0.5, -0.5),
			vec2(0.0, 0.0)
		];
		v2 = [
			vec2(-0.5, 0.5),
			vec2(0.5, 0.5),
			vec2(0.0, 0.0)
		];
		v3 = [
			vec2(-0.5, -0.5),
			vec2(-0.5, 0.5),
			vec2(0.0, 0.0)
		];
		v4 = [
			vec2(0.5, 0.5),
			vec2(0.5, -0.5),
			vec2(0.0, 0.0)
		];

	}
	else if (primitive == "pentagon") {
		
		
		v1 = [
			vec2(0.0, 0.0),
			vec2(0.0, 0.5),
			vec2(s1*0.5, c1*0.5)
		];
		v2 = [
			vec2(0.0, 0.0),
			vec2(s1*0.5, c1*0.5),
			vec2(s2*0.5, -c2*0.5)
		];
		v3 = [
			vec2(0.0, 0.0),
			vec2(s2*0.5, -c2*0.5),
			vec2(-s2*0.5, -c2*0.5)
		];
		v4 = [
			vec2(0.0, 0.0),
			vec2(-s2*0.5, -c2*0.5),
			vec2(-s1*0.5, c1*0.5)
		];
		v5 = [
			vec2(0.0, 0.0),
			vec2(-s1*0.5, c1*0.5),
			vec2(0.0, 0.5)
		];
	}
}

/* display is basicly the same as init, but we don't init vertices, just make division agian and render points */
function display() {
	dividePrimitive();

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	
	var program = initShaders( gl, "vertex-shader", "fragment-shader");
	gl.useProgram( program );
	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation( program, "vPosition");
	gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray( vPosition);

	render();
}

// When subdivision is changed with slider, reset points array and calculate points again
function onSubDivisionChanged(value) {
	points = [];
	NumTimesToSubdivide = document.getElementById("slider1").value;
	console.log(NumTimesToSubdivide)
	document.querySelector('#num').value = value;
	display();
	
};

function onAngleChanged(value) {
	points = [];
	angle = document.getElementById("slider2").value;
	document.querySelector('#angle').value = value;
	display();
}

// When drawable geometry object is changed, rest point, calculate new verices and display
function onPrimitiveChanged() {
	points = [];
	primitive = document.querySelector('#primitiveselector').value;
	initVertices(primitive);
	display();
	
}

/* rotatePoint takes point as 2D-vector and angle and return new point rotated with givnen angle */ 
function rotatePoint(v, phii) {
	var distance = Math.sqrt(v[0]*v[0] + v[1]*v[1]);
	/* Angle is scaled depending on maximum distance from origin */
	var tphii = distance/scale * phii/180*Math.PI;
	var x = v[0] * Math.cos(tphii) - v[1] * Math.sin(tphii);
	var y = v[0] * Math.sin(tphii) + v[1] * Math.cos(tphii);
	return new vec2(x, y);
}

function triangle(a, b, c) {
	points.push( a, b, c);
}

function divideTriangle(a, b, c, count) {

	// Check end of recursion
	if ( count === 0) {
		
		// Rotate points and push them to array
		var at = rotatePoint(a, angle);
		var bt = rotatePoint(b, angle);
		var ct = rotatePoint(c, angle);
		triangle(at, bt, ct);
	}
	else {
		// Bisect the sides
		var ab = mix( a, b, 0.5 );
		var ac = mix( a, c, 0.5 );
		var bc = mix( b, c, 0.5 );
		--count;
		// Three new triangles
		divideTriangle(a, ab, ac, count);
		divideTriangle(c, ac, bc, count);
		divideTriangle(b, bc, ab, count);
		//divideTriangle(ab, bc, ac, count);
	}
	
}

function render() {
	gl.clear( gl.COLOR_BUFFER_BIT);
	gl.drawArrays( gl.TRIANGLES, 0, points.length );
}