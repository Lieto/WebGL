/**
 * Created by Vesa on 2.8.2015.
 */
/**
 *  Variables
 */

    // WebGL and canvas
var canvas;
var gl;

// list for objects to render

var elements = [];

// object variables: location, dimension....
var x, y, z;
var radius, height;

// camera variables: distance form origin, angles, field of view, coordinates...
var cameraRadius = 1.0;
var theta = 0.0;
var phi = 0.0;
var fovy = 45.0;
var eye = null;

// Control GUI
var controls;
var gui;

// dictionary for colors
var colors = { "black" : vec4(0.0, 0.0, 0.0, 1.0),
    "red" : vec4(1.0, 0.0, 0.0, 1.0),
    "yellow" : vec4(1.0, 1.0, 0.0, 1.0),
    "green" : vec4(0.0, 1.0, 0.0, 1.0),
    "blue" : vec4(0.0, 0.0, 1.0, 1.0),
    "magenta" : vec4(1.0, 0.0, 1.0, 1.0),
    "cyan" : vec4(0.0, 1.0, 1.0, 1.0)
};

// default color
var color = colors["red"];

// Model-View and perspectiv matrices
var pMatrix = null;
var mvMatrix = null;
var viewMatrix = null;


var cameraPitch = 0;
var cameraYaw = -45;
var cameraXPos = 0;
var cameraYPos = 10.0;
var cameraZPos = 10.0;

var xAxis, yAxis, zAxis;
var xTip, yTip, zTip;


/**
 * Helper object to create 2d-objects
 *
 */
Shape = {

    Ngon: function(n, radius, startAngle, z) {
        var vertices = [];
        var dA = Math.PI * 2 / n;
        var r =  radius;
        var angle;
        var x, y;

        for (var i = 0; i < n; i++) {
            angle = startAngle + dA*i;
            x = r * Math.cos(angle);
            y = r * Math.sin(angle);
            vertices.push(x);
            vertices.push(y);
            vertices.push(z);
        }

        return vertices;

    }
};


/**
 * Creates Superclass for 3d objects
 * @param {vec3} center - Object center
 * @param {float} radius - Radius of bottom or top disk
 * @param {float} height - Height of tube
 * @param {vec4} orientation - Facing
 */
var Object_3D = function(center, radius, height, orientation) {

    this.center = center;
    this.radius = radius;
    this.height = height;
    this.orientation = orientation;
    this.vertices = [];
    this.indices = [];
    this.theta = [orientation[0], orientation[1], orientation[2]];
    this.translate = [center[0], center[1], center[2]];
    this.type = null;


    this.program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.colorString = controls.switchColor;
    this.color = colors[this.colorString];

};


Object_3D.prototype.render = function() {
    gl.useProgram(this.program);

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( this.program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var colorLoc = gl.getUniformLocation(this.program, 'fColor');

    var thetaLoc = gl.getUniformLocation(this.program, 'theta');

    var pLoc = gl.getUniformLocation(this.program, 'p');

    var mvLoc = gl.getUniformLocation(this.program, 'mv');

    //var scaleLoc = gl.getUniformLocation(element.program, 'scale');
    var translateLoc = gl.getUniformLocation(this.program, 'translate');

    gl.uniform3fv(thetaLoc, this.theta);
    gl.uniform3fv(translateLoc, this.translate);

    gl.uniform4fv(colorLoc, this.color);


    gl.uniformMatrix4fv(pLoc, false, flatten(pMatrix));

    gl.uniformMatrix4fv(mvLoc, false, flatten(viewMatrix));

    console.log("Rendering element");
    // draw first triangles fillde with color
    gl.drawElements(gl.TRIANGLE_FAN, this.indices.length, gl.UNSIGNED_SHORT, 0);

    // draw "wireframe" on opt of it
    gl.uniform4fv(colorLoc, colors["black"]);
    gl.drawElements( gl.LINE_LOOP, this.indices.length, gl.UNSIGNED_SHORT, 0);

};
Object_3D.prototype.toString = function() {

    return " Type: " + this.type +
            " Location: " + this.center +
            " Orientation: " + this.orientation +
            " Radius: " + this.radius +
            " Height: " + this.height +
            " Color: " + this.colorString +
            "\n";

};




/**
 * Creates Sphere object
 * @param {vec3} center - Object center
 * @param {float} radius - Radius of bottom or top disk
 * @param {float} height - Convenince parameter, no tused
 * @param {vec4} orientation - Facing
 */
function Sphere(center, radius, height, orientation) {
    Object_3D.call(this, center, radius, height, orientation);

    this.lats = 30;
    this.longs = 30;
    this.type = "sphere";


    for (var latNumber = 0; latNumber <= this.lats; ++latNumber) {
        for (var longNumber = 0; longNumber <= this.longs; ++longNumber) {
            var theta = latNumber * Math.PI / this.lats;
            var phi = longNumber * 2 * Math.PI / this.longs;
            var sinTheta = Math.sin(theta);
            var sinPhi = Math.sin(phi);
            var cosTheta = Math.cos(theta);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            this.vertices.push(this.radius * x);
            this.vertices.push(this.radius * y);
            this.vertices.push(this.radius * z);
        }
    }

    for (var latNumberI = 0; latNumberI < this.lats; ++latNumberI) {
        for (var longNumberI = 0; longNumberI < this.longs; ++longNumberI) {
            var first = (latNumberI * (this.longs+1)) + longNumberI;
            var second = first + this.longs + 1;
            this.indices.push(first);
            this.indices.push(second);
            this.indices.push(first+1);

            this.indices.push(second);
            this.indices.push(second+1);
            this.indices.push(first+1);
        }
    }

}

Sphere.prototype = Object.create(Object_3D.prototype);
Sphere.prototype.constructor = Sphere;


/**
 * Creates Cone object
 * @param {vec3} center - Object center
 * @param {float} radius - Radius of bottom disk
 * @param {float} height - Height of cone
 * @param {vec4} orientation - Facing
 */
function Cone(center, radius, height, orientation) {
    Object_3D.call(this, center, radius, height, orientation);

    this.n = 30;
    this.startAngle = 1;
    this.type = "cone";

    this.bottom = [];
    this.top = [];

    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom = this.bottom.concat(Shape.Ngon(this.n, this.radius, this.startAngle, 0.0));


    this.top.push(0.0);
    this.top.push(0.0);
    this.top.push(this.height);

    this.vertices = this.bottom.concat(this.top);

    for (var i = 0; i < this.n; i++) {
        if (i === this.n-1) {
            this.indices.push(0);
            this.indices.push(this.n);
            this.indices.push(1);

        }else {
            this.indices.push(0);
            this.indices.push(i+1);
            this.indices.push(i+2);
        }
    }

    for (var j = 1; j <= this.n; j++) {
        if (j === this.n) {
            this.indices.push(this.n+1);
            this.indices.push(j);
            this.indices.push(11);
        }
        else {
            this.indices.push(this.n + 1);
            this.indices.push(j);
            this.indices.push(j+1);
        }
    }


}


Cone.prototype = Object.create(Object_3D.prototype);
Cone.prototype.constructor = Cone;

/**
 * Creates Cylinder object
 * @param {vec3} center - Object center
 * @param {float} radius - Radius of bottom or top disk
 * @param {float} height - Height of tube
 * @param {vec4} orientation - Facing
 */
function Cylinder(center, radius, height, orientation) {
    Object_3D.call(this, center, radius, height, orientation);

    this.n = 30;
    this.startAngle = 0;
    this.type = "cylinder";

    this.bottom = [];
    this.top = [];


    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom = this.bottom.concat(Shape.Ngon(this.n, this.radius, this.startAngle, 0.0));

    this.top.push(0.0);
    this.top.push(0.0);
    this.top.push(-this.height);
    this.top = this.top.concat(Shape.Ngon(this.n, this.radius, this.startAngle, -this.height));

    this.vertices = this.bottom.concat(this.top);

    var n = this.n;

    for (var i = 0; i < n; i++) {
        if (i === n-1) {
            this.indices.push(0);
            this.indices.push(n);
            this.indices.push(1);
        } else {
            this.indices.push(0);
            this.indices.push(i+1);
            this.indices.push(i+2);
        }

    }

    var offset = n + 1;

    for (var j = 0; j < n; j++) {
        if (j === n-1) {
            this.indices.push(offset);
            this.indices.push(n + offset);
            this.indices.push(1 + offset);
        } else {
            this.indices.push(offset);
            this.indices.push(j + 1 + offset);
            this.indices.push(j + 2 + offset);
        }
    }


    for (var k =  1; k <= n-1; k++) {

        if (k === n - 1) {

            this.indices.push(k);
            this.indices.push(1);
            this.indices.push(k + offset);

            this.indices.push(k);
            this.indices.push(1 + offset);
            this.indices.push(k + offset);


        } else {

            this.indices.push(k);
            this.indices.push(k+1);
            this.indices.push(k+1+offset);

            this.indices.push(k);
            this.indices.push(k + offset);
            this.indices.push(k + 1 + offset);
        }
    }



}



Cylinder.prototype = Object.create(Object_3D.prototype);
Cylinder.prototype.constructor = Cylinder;

var Axis = function(gl, start, end, color, coneRadius) {

    this.vertices = [];
    this.indices = [];

    this.start = start;
    this.end = end;

    this.theta = [0.0, 0.0, 0.0];
    this.translate = [0.0, 0.0, 0.0];

    this.vertices.push(start[0]);
    this.vertices.push(start[1]);
    this.vertices.push(start[2]);

    this.vertices.push(end[0]);
    this.vertices.push(end[1]);
    this.vertices.push(end[2]);

    this.indices.push(0);
    this.indices.push(1);

    this.program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.color = color;




}
/**
 * Creates Line object
 * @param {!WebGLContext} gl - Web GL Context
 * @param {vec3} start - Start point
 * @param {vec3} end - End point
 * @param {vec4} color - Color
 */
var Line = function(gl, start, end, color) {

    this.vertices = [];
    this.indices = [];

    this.start = start;
    this.end = end;


    this.theta = [0.0, 0.0, 0.0];
    this.translate = [0.0, 0.0, 0.0];

    this.vertices.push(start[0]);
    this.vertices.push(start[1]);
    this.vertices.push(start[2]);

    this.vertices.push(end[0]);
    this.vertices.push(end[1]);
    this.vertices.push(end[2]);

    this.indices.push(0);
    this.indices.push(1);

    this.program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.color = color;

    this.render = function() {

        gl.useProgram(this.program);
        var iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

        var vPosition = gl.getAttribLocation( this.program, 'vPosition');
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        var colorLoc = gl.getUniformLocation(this.program, 'fColor');

        var thetaLoc = gl.getUniformLocation(this.program, 'theta');


        //var scaleLoc = gl.getUniformLocation(element.program, 'scale');
        var translateLoc = gl.getUniformLocation(this.program, 'translate');

        gl.uniform3fv(thetaLoc, this.theta);
        gl.uniform3fv(translateLoc, this.translate);

        gl.uniform4fv(colorLoc, this.color);


        var pLoc = gl.getUniformLocation(this.program, 'p');

        var mvLoc = gl.getUniformLocation(this.program, 'mv');

        gl.uniformMatrix4fv(pLoc, false, flatten(pMatrix));

        gl.uniformMatrix4fv(mvLoc, false, flatten(viewMatrix));

        console.log("Rendering line");
        gl.drawElements( gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }


};


/**
 * Renders axis and objects in elements-list
 *
 */
render = function() {
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    xAxis.render();
    yAxis.render();
    zAxis.render();

    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        element.render();
    }

    //requestAnimationFrame(render);

};


/**
 * Sets model-view and perpective matrixes for pipeline from controls
 *
 */
setupCamera = function() {


    eye = vec3(controls.cameraRadius*Math.sin(radians(controls.cameraTheta))*Math.cos(radians(controls.cameraPhi)),
        controls.cameraRadius*Math.sin(radians(controls.cameraTheta))*Math.sin(radians(controls.cameraPhi)),
    controls.cameraRadius*Math.cos(radians(controls.cameraTheta)));

    viewMatrix = lookAt(eye, new vec3(0, 0, 0), new vec3(0, 1, 0));

    mvMatrix = mat4();

    pMatrix = perspective(fovy, canvas.width/ canvas.height, 0.1, 100);

};
/**
 * Setup WebGL, init canvas, controls and GUI for controls
 *
 */
window.onload = function init() {

    canvas = document.getElementById('canvas');
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) { alert('WebGL is not available'); }

    controls = new function() {
        this.elementtype = "sphere";
        this.switchColor = "red";
        this.cameraRadius = 10;

        this.cameraTheta = 0;
        this.cameraPhi = 0;

        this.elementRadius = 1.0;
        this.elementHeight = 1.0;
        this.elementX = 0.0;
        this.elementY = 0.0;
        this.elementZ = 0.0;
        this.elementRotX = 0;
        this.elementRotY = 0;
        this.elementRotZ = 0;
        this.addElement = function() {

            var element = null;

            switch (this.elementtype) {
                case "sphere":
                    element = new Sphere(new vec3(this.elementX, this.elementY, this.elementZ),
                        this.elementRadius, this.elementHeight, new vec3(this.elementRotX,
                            this.elementRotY, this.elementRotZ));
                    break;
                case "cone":
                    element = new Cone(new vec3(this.elementX, this.elementY, this.elementZ),
                        this.elementRadius, this.elementHeight, new vec3(this.elementRotX,
                            this.elementRotY, this.elementRotZ));
                    break;
                case "cylinder":
                    element = new Cylinder(new vec3(this.elementX, this.elementY, this.elementZ),
                        this.elementRadius, this.elementHeight, new vec3(this.elementRotX,
                            this.elementRotY, this.elementRotZ));
                    break;
            }

            elements.push(element);
            render();
        };
        this.ListElements = function() {
            for (var i = 0; i < elements.length; i++) {
                console.log(elements[i].toString());

            }
        }

    };

    gui = new dat.GUI();
    var customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    gui.add(controls, 'elementtype', ["sphere", "cone", "cylinder"]);


    gui.add(controls, 'switchColor', ["black", "red", "yellow", "green", "blue", "magenta", "cyan"]);

    gui.add(controls, 'elementRadius', 0.1, 10);
    gui.add(controls, 'elementHeight', 0.1, 10);
    gui.add(controls, 'elementX', -10, 10);
    gui.add(controls, 'elementY', -10, 10);
    gui.add(controls, 'elementZ', -10, 10);
    gui.add(controls, 'elementRotX', -180, 180);
    gui.add(controls, 'elementRotY', -180, 180);
    gui.add(controls, 'elementRotZ', -180, 180);
    gui.add(controls, 'addElement');
    gui.add(controls, 'ListElements');

    var f2 = gui.addFolder("Camera");
    var cameraRadiusController = f2.add(controls, 'cameraRadius', 0, 30);
    var cameraThetaController = f2.add(controls, 'cameraTheta', -180, 180);
    var cameraPhiController = f2.add(controls, 'cameraPhi', -180, 180);

    cameraRadiusController.onFinishChange(function(value) {

        setupCamera();
        render();
    });

    cameraThetaController.onFinishChange(function(value) {

        setupCamera();
        render();
    });

    cameraPhiController.onFinishChange(function(value) {

        setupCamera();
        render();
    });



    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);


    xAxis = new Line(gl, new vec3(-100.0, 0.0, 0.0), new vec3(100.0, 0.0, 0.0), colors["black"]);
    yAxis = new Line(gl, new vec3(0.0, -100.0, 0.0), new vec3(0.0, 100.0, 0.0), colors["blue"]);
    zAxis = new Line(gl, new vec3(0.0, 0.0, -100.0), new vec3(0.0, 0.0, 100.0), colors["yellow"]);

    setupCamera();


    render();


};