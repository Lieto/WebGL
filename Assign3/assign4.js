/**
 * Created by Vesa on 27.8.2015.
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

var lightSources = null;
var globalAmbientLight = null;

// Model-View and perspectiv matrices
var pMatrix = null;
var mvMatrix = null;
var viewMatrix = null;
var normalMatrix = null;


var cameraPitch = 0;
var cameraYaw = -45;
var cameraXPos = 0;
var cameraYPos = 10.0;
var cameraZPos = 10.0;

var xAxis, yAxis, zAxis;
var xTip, yTip, zTip;

var ColorUtils =  {

    hexToRgb : function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToGL : function(rgb) {
        return rgb ? {
            r: rgb.r / 255,
            g: rgb.g / 255,
            b: rgb.b / 255
        } : null;
    },

    hexToGL : function(hex) {
        return this.rgbToGL(
            this.hexToRgb(hex)
        );
    },

    hexToGLvec4 : function(hex) {
        var temp = this.rgbToGL(this.hexToRgb(hex));
        return vec4(temp.r, temp.g, temp.b, 1.0);
    }
};

var Light = {

    attenuationFactor: 0.2,

    defaultSource : function() {
        return {
            initialPosition: vec4(3.0, 3.0, 3.0, 0.0),
            lightPosition: vec4(3.0, 3.0, 3.0, 0.0),
            lightAmbient: vec4(1.0, 1.0, 1.0, 1.0),
            lightDiffuse: vec4(1.0, 1.0, 1.0, 1.0),
            lightSpecular: vec4(1.0, 1.0, 1.0, 1.0),
            lightAnimated: true,
            theta: 0.0,
            gamma: 0.0,
            rotation: 'INC',
            lightDistance: 0.0,
            attenuation: 1.0,
            enabled: true
        };

    },

    alternateSource :function() {
        return {
            initialPosition: vec4(-3.0, -3.0, -3.0, 0.0),
            lightPosition: vec4(-3.0, -3.0, -3.0, 0.0),
            lightAmbient: ColorUtils.hexToGLvec4('#333333'),
            lightDiffuse: ColorUtils.hexToGLvec4('#ffdd05'),
            lightSpecular: vec4(1.0, 1.0, 1.0, 1.0),
            lightAnimated: true,
            theta: 100.0,
            gamma: 100.0,
            rotation: 'DEC',
            lightDistance: 0.0,
            attenuation: 1.0,
            enabled: true

        };
    },

    globalAmbient : function() {
        var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0),
            lightSpecular = vec4(0.0, 0.0, 0.0, 1.0),
            materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0),
            materialSpecular = vec4(0.0, 0.0, 0.0, 1.0);

        return {
            lightPosition: vec4(-2.0, -2.0, -2.0, 0.0),
            lightAmbient: vec4(0.1, 0.1, 0.1, 1.0),
            diffuseProduct: mult(lightDiffuse, materialDiffuse),
            specularProduct: mult(lightSpecular, materialSpecular),
            attenuation: 0.2
        };
    },

    numEnabled : function(lightSources) {
        var count = 0;
        for (var i = 0; i < lightSources.length; i++) {
            if (lightSources[i].enabled) {
                count += 1;
            }
        }
        return count;
    },

    indexEnabled : function(lightSources) {
        var index = null;

        for (var i = 0; i < lightSources.length; i++) {
            if (lightSources[i].enabled) {
                index = i;
                break;
            }
        }

        return index;
    },

    rotatePoint2D: function(theta, radius) {
        var thetaRad = radians(theta);
        var newX = radius * Math.cos(theta);
        var newY = radius * Math.sin(theta);

        return vec2(newX, newY);
    },

    rotatePoint3D: function(point, xAngle, yAngle) {
        var origX = point[0];
        var origY = point[1];
        var origZ = point[2];
        var xAngleRad = radians(xAngle);
        var yAngleRad = radians(yAngle);

        var newX = (Math.cos(yAngleRad) * origX) +
            (Math.sin(yAngleRad)*Math.sin(xAngleRad) * origY) -
            (Math.sin(yAngleRad)*Math.cos(xAngleRad) * origZ);

        var newY = (Math.cos(xAngleRad) * origY) +
            (Math.sin(xAngleRad)* origZ);

        var newZ = (Math.sin(yAngleRad) * origX) +
            (Math.cos(yAngleRad)* origY) +
            (Math.cos(yAngleRad)*Math.cos(xAngleRad) * origZ);

        return vec3(newX, newY, newZ);


    }
};

var updateElementsWithLightSource = function() {

    for (var i = 0; i < elements.length; i++) {
        elements[i].ambientProduct = [];
        elements[i].diffuseProduct = [];
        elements[i].specularProduct = [];

/*
        elements[i].color = colors[controls.Color];
        elements[i].Diffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
        elements[i].Specular = ColorUtils.hexToGLvec4(controls.Specular);
        //console.log(this.color);

        elements[i].materialDiffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
        elements[i].materialSpecular = ColorUtils.hexToGLvec4(controls.Specular);
        elements[i].materialShininess = controls.Shininess;
*/
        for (var j = 0; j < lightSources.length; j++) {
            elements[i].ambientProduct[j] = mult(lightSources[j].lightAmbient, elements[i].color);
            elements[i].diffuseProduct[j] = mult(lightSources[j].lightDiffuse, elements[i].materialDiffuse);
            elements[i].specularProduct[j] = mult(lightSources[j].lightSpecular, elements[i].materialSpecular);

        }
    }
};

var updateLightSources = function() {

        lightSources[0].enabled = controls.Light1On;
        lightSources[0].lightAnimated = controls.AnimateLight1;
        lightSources[0].lightAmbient = ColorUtils.hexToGLvec4(controls.AmbientLight1);
        lightSources[0].lightDiffuse = ColorUtils.hexToGLvec4(controls.DiffuseLight1);
        lightSources[0].lightSpecular = ColorUtils.hexToGLvec4(controls.SpecularLight1);
        lightSources[0].lightDistance = controls.DistanceLight1;
        lightSources[0].attenuation = 1 / (1 + (Light.attenuationFactor * Math.pow(controls.DistanceLight1, 2)));

        lightSources[1].enabled = controls.Light2On;
        lightSources[1].lightAnimated = controls.AnimateLight2;
        lightSources[1].lightAmbient = ColorUtils.hexToGLvec4(controls.AmbientLight2);
        lightSources[1].lightDiffuse = ColorUtils.hexToGLvec4(controls.DiffuseLight2);
        lightSources[1].lightSpecular = ColorUtils.hexToGLvec4(controls.SpecularLight2);
        lightSources[1].lightDistance = controls.DistanceLight2;
        lightSources[1].attenuation = 1 / (1 + (Light.attenuationFactor * Math.pow(controls.DistanceLight2, 2)));

    updateElementsWithLightSource();

};



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
            vertices.push(vec4(x, y, z, 1.0));
            /*
            vertices.push(x);
            vertices.push(y);
            vertices.push(z);
            */
        }

        return vertices;

    },

    triangleNormal: function(a, b, c) {
        var t1 = subtract(b, a);
        var t2 = subtract(c, a);

        var normal = normalize(cross(t2, t1));
        return normal;
    },

    computeNormal: function(a, b, c) {
        var t1 = subtract(b, a);
        var t2 = subtract(c, a);
        var normal = vec3(cross(t2, t1));
        return normal;
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
    this.uVertices = [];
    this.uNormals = [];
    this.vertices = [];
    this.indices = [];
    this.normals = [];
    this.theta = [orientation[0], orientation[1], orientation[2]];
    this.translate = [center[0], center[1], center[2]];
    this.type = null;
    this.modelViewMatrix = mat4();
    this.normalMatrix = mat4();
    this.diffuse = null;
    this.specular = null;
    this.materialDiffuse = null;
    this.materialSpecular = null;
    this.materialShininess = null;
    this.ambientProduct = null;
    this.diffuseProduct = null;
    this.specularProduct = null;
    this.globalAmbientProduct = null;


    this.program1 = initShaders(gl, "vertex-shader", "fragment-shader");
    this.program2 = initShaders(gl, "vertex-shader-2", "fragment-shader-2");
    this.colorString = controls.Color;
    this.color = colors[this.colorString];

    this.Diffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
    this.Specular = ColorUtils.hexToGLvec4(controls.Specular);
    //console.log(this.color);

    //this.materialDiffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
    //this.materialSpecular = ColorUtils.hexToGLvec4(controls.Specular);
    this.materialShininess = controls.Shininess;

};

Object_3D.prototype.update = function() {
    this.modelViewMatrix = mat4();
    this.normalMatrix = mat4();

//    this.color = colors[controls.Color];


    this.ambientProduct = [];
    this.diffuseProduct = [];
    this.specularProduct = [];

    console.log(lightSources.length);
    for (var i = 0; i < lightSources.length; i++) {
        this.ambientProduct[i] = mult(lightSources[i].lightAmbient, this.color);
        this.diffuseProduct[i] = mult(lightSources[i].lightDiffuse, this.Diffuse);
        this.specularProduct[i] = mult(lightSources[i].lightSpecular, this.Specular);
    }
    this.globalAmbientProduct = mult(globalAmbientLight.lightAmbient, this.color);


    this.modelViewMatrix = mult(rotate(this.theta[0], [1, 0, 0]), this.modelViewMatrix);
    this.modelViewMatrix = mult(rotate(this.theta[1], [0, 1, 0]), this.modelViewMatrix);
    this.modelViewMatrix = mult(rotate(this.theta[2], [0, 0, 1]), this.modelViewMatrix);
    this.modelViewMatrix  = mult(translate(this.translate[0], this.translate[1], this.translate[2]), this.modelViewMatrix);

    this.modelViewMatrix = mult(viewMatrix, this.modelViewMatrix);

    this.normalMatrix = inverseMat3(flatten(this.modelViewMatrix));
    this.normalMatrix = transpose(this.normalMatrix);
    //this.normalMatrix = normalMatrix(this.modelViewMatrix, true);
};

Object_3D.prototype.render = function() {

    var program;
    if (Light.numEnabled(lightSources) <= 1) {
        program = this.program2;
    } else {
        program = this.program1;
    }
    gl.useProgram(program);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    /*
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
*/
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(this.modelViewMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(this.normalMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(pMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));


    var numL = Light.numEnabled(lightSources);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), this.materialShininess);
    switch(numL) {
        case 0:
            gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(this.globalAmbientProduct));
            gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(globalAmbientLight.diffuseProduct));
            gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(globalAmbientLight.specularProduct));
            gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(globalAmbientLight.lightPosition));
            gl.uniform1f(gl.getUniformLocation(program, "attenuation"), globalAmbientLight.attenuation);
            break;
        case 1:
            var lightIndex = Light.indexEnabled(lightSources);
            gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(this.ambientProduct[lightIndex]));
            gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(this.diffuseProduct[lightIndex]));
            gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(this.specularProduct[lightIndex]));
            gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightSources[lightIndex].lightPosition));
            gl.uniform1f(gl.getUniformLocation(program, "attenuation"), lightSources[lightIndex].attenuation);
            break;


        default:
            var allAmbient = this.ambientProduct[0].concat(this.ambientProduct[1]);
            var allDiffuse = this.diffuseProduct[0].concat(this.diffuseProduct[1]);
            var allSpecular = this.specularProduct[0].concat(this.specularProduct[1]);
            var allPos = lightSources[0].lightPosition.concat(lightSources[1].lightPosition);

            gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(allAmbient));
            gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(allDiffuse));
            gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(allSpecular));
            gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(allPos));
            gl.uniform1f(gl.getUniformLocation(program, "attenuationA"), lightSources[0].attenuation);
            gl.uniform1f(gl.getUniformLocation(program, "attenuationB"), lightSources[1].attenuation);
            break;

    }

    console.log("Rendering element");
    // draw first triangles fillde with color
    for( var i = 0; i < this.vertices.length; i+=3) {
        gl.drawArrays( gl.TRIANGLES, i, 3);
    }

    //gl.drawElements(gl.TRIANGLE_FAN, this.indices.length, gl.UNSIGNED_SHORT, 0);

    // draw "wireframe" on opt of it
    //gl.uniform4fv(colorLoc, colors["black"]);
    //gl.drawElements( gl.LINE_LOOP, this.indices.length, gl.UNSIGNED_SHORT, 0);

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

            this.uVertices.push(vec4(this.radius*x, this.radius*y, this.radius*z, 1.0));
            this.uNormals.push(vec3(x, y, z));

            /*
            this.vertices.push(this.radius * x);
            this.vertices.push(this.radius * y);
            this.vertices.push(this.radius * z);
            */
        }
    }

    for (var latNumberI = 0; latNumberI < this.lats; ++latNumberI) {
        for (var longNumberI = 0; longNumberI < this.longs; ++longNumberI) {
            var first = (latNumberI * (this.longs+1)) + longNumberI;
            var second = first + this.longs + 1;
            this.indices.push(first);
            this.vertices.push(this.uVertices[first]);
            this.normals.push(this.uNormals[first]);

            this.indices.push(second);
            this.vertices.push(this.uVertices[second]);
            this.normals.push(this.uNormals[second]);


            this.indices.push(first+1);
            this.vertices.push(this.uVertices[first+1]);
            this.normals.push(this.uNormals[first+1]);


            this.indices.push(second);
            this.vertices.push(this.uVertices[second]);
            this.normals.push(this.uNormals[second]);

            this.indices.push(second+1);
            this.vertices.push(this.uVertices[second+1]);
            this.normals.push(this.uNormals[second+1]);

            this.indices.push(first+1);
            this.vertices.push(this.uVertices[first+1]);
            this.normals.push(this.uNormals[first+1]);

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
    this.tn = null;

    this.bottom = [];
    this.top = [];

    /*
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    */

    this.bottom.push(vec4(0.0, 0.0, 0.0, 1.0));
    this.bottom = this.bottom.concat(Shape.Ngon(this.n, this.radius, this.startAngle, 0.0));


    this.top.push(vec4(0.0, 0.0, this.height, 1.0));

    /*
    this.top.push(0.0);
    this.top.push(0.0);
    this.top.push(this.height);
*/
    this.uVertices = this.bottom.concat(this.top);

    for (var i = 0; i < this.n; i++) {
        if (i === this.n-1) {
            this.indices.push(0);
            this.indices.push(1);
            this.indices.push(this.n);

            this.vertices.push(this.uVertices[0]);
            this.vertices.push(this.uVertices[1]);
            this.vertices.push(this.uVertices[this.n]);

            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));

        }else {
            this.indices.push(0);
            this.indices.push(i+2);
            this.indices.push(i+1);

            this.vertices.push(this.uVertices[0]);
            this.vertices.push(this.uVertices[i+2]);
            this.vertices.push(this.uVertices[i+1]);

            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
        }
    }

    for (var kn = 0; kn <= this.uVertices.length; kn++) {
        this.uNormals[kn] = vec3(0.0, 0.0, 0.0);

    }

    for (var j = 1; j <= this.n; j++) {
        if (j === this.n) {

            this.tn = Shape.computeNormal(this.uVertices[this.n+1], this.uVertices[j], this.uVertices[1]);

            this.indices.push(this.n+1);
            this.indices.push(j);
            this.indices.push(1);

            this.vertices.push(this.uVertices[this.n+1]);
            this.vertices.push(this.uVertices[j]);
            this.vertices.push(this.uVertices[1]);

            this.uNormals[this.n+1] = add(this.tn, this.uNormals[this.n+1]);
            this.uNormals[j] = add(this.tn, this.uNormals[j]);
            this.uNormals[1] = add(this.tn, this.uNormals[1]);
        }
        else {

            this.tn = Shape.computeNormal(this.uVertices[this.n+1], this.uVertices[j], this.uVertices[j+1]);

            this.indices.push(this.n + 1);
            this.indices.push(j);
            this.indices.push(j+1);

            this.vertices.push(this.uVertices[this.n+1]);
            this.vertices.push(this.uVertices[j]);
            this.vertices.push(this.uVertices[j+1]);

            this.uNormals[this.n+1] = add(this.tn, this.uNormals[this.n+1]);
            this.uNormals[j] = add(this.tn, this.uNormals[j]);
            this.uNormals[j+1] = add(this.tn, this.uNormals[j+1]);
        }
    }

    for (var knn = 0; knn < this.uNormals.length; knn++) {
        var curNormal = this.uNormals[knn];
        this.uNormals[knn] = normalize(curNormal);
    }

    for (var j2 = 1; j2 <= this.n; j2++) {
        if (j2 === this.n) {
            this.normals.push(this.uNormals[this.n+1]);
            this.normals.push(this.uNormals[j2]);
            this.normals.push(this.uNormals[1]);
        } else {
            this.normals.push(this.uNormals[this.n+1]);
            this.normals.push(this.uNormals[j2]);
            this.normals.push(this.uNormals[j2+1]);
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

/*
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    this.bottom.push(0.0);
    */
    this.bottom.push(vec4(0.0, 0.0, 0.0, 1.0));
    this.bottom = this.bottom.concat(Shape.Ngon(this.n, this.radius, this.startAngle, 0.0));

    /*
    this.top.push(0.0);
    this.top.push(0.0);
    this.top.push(-this.height);
    */
    this.top.push(vec4(0.0, 0.0, -this.height, 1.0));
    this.top = this.top.concat(Shape.Ngon(this.n, this.radius, this.startAngle, -this.height));

    this.uVertices = this.bottom.concat(this.top);
    //this.vertices = this.bottom.concat(this.top);

    var n = this.n;

    for (var i = 0; i < n; i++) {
        if (i === n-1) {
            this.indices.push(0);
            this.indices.push(1);
            this.indices.push(n);

            this.vertices.push(this.uVertices[0]);
            this.vertices.push(this.uVertices[1]);
            this.vertices.push(this.uVertices[n]);

            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
        } else {
            this.indices.push(0);
            this.indices.push(i+2);
            this.indices.push(i+1);


            this.vertices.push(this.uVertices[0]);
            this.vertices.push(this.uVertices[i+2]);
            this.vertices.push(this.uVertices[i+1]);

            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
            this.normals.push(vec3(0.0, -1.0, 0.0));
        }

    }

    var offset = n + 1;

    for (var j = 0; j < n; j++) {
        if (j === n-1) {
            this.indices.push(offset);
            this.indices.push(n + offset);
            this.indices.push(1 + offset);

            this.vertices.push(this.uVertices[offset]);
            this.vertices.push(this.uVertices[n + offset]);
            this.vertices.push(this.uVertices[1 + offset]);

            this.normals.push(vec3(0.0, 1.0, 0.0));
            this.normals.push(vec3(0.0, 1.0, 0.0));
            this.normals.push(vec3(0.0, 1.0, 0.0));
        } else {
            this.indices.push(offset);
            this.indices.push(j + 1 + offset);
            this.indices.push(j + 2 + offset);

            this.vertices.push(this.uVertices[offset]);
            this.vertices.push(this.uVertices[j + 1 + offset]);
            this.vertices.push(this.uVertices[j + 2  + offset]);

            this.normals.push(vec3(0.0, 1.0, 0.0));
            this.normals.push(vec3(0.0, 1.0, 0.0));
            this.normals.push(vec3(0.0, 1.0, 0.0));
        }
    }

    for (var kn = 0; kn < this.uVertices.length; kn++) {
        this.uNormals[kn] = vec3(0.0, 0.0, 0.0);
    }


    for (var k =  1; k <= n-1; k++) {

        if (k === n - 1) {

            var ftn = Shape.computeNormal(this.uVertices[k], this.uVertices[1], this.uVertices[k + offset]);

            this.indices.push(k);
            this.indices.push(1);
            this.indices.push(k + offset);

            this.vertices.push(this.uVertices[k]);
            this.vertices.push(this.uVertices[1]);
            this.vertices.push(this.uVertices[k + offset]);

            this.uNormals[k] = add(ftn, this.uNormals[k]);
            this.uNormals[1] = add(ftn, this.uNormals[1]);
            this.uNormals[k + offset] = add(ftn, this.uNormals[k + offset]);

            var stn = Shape.computeNormal(this.uVertices[1], this.uVertices[1+offset], this.uVertices[k+offset]);

            this.indices.push(1);
            this.indices.push(1 + offset);
            this.indices.push(k + offset);

            this.vertices.push(this.uVertices[1]);
            this.vertices.push(this.uVertices[1 + offset]);
            this.vertices.push(this.uVertices[k + offset]);

            this.uNormals[1] = add(stn, this.uNormals[1]);
            this.uNormals[1 + offset] = add(stn, this.uNormals[1 + offset]);
            this.uNormals[k + offset] = add(stn, this.uNormals[k + offset]);




        } else {

            var ftn = Shape.computeNormal(this.uVertices[k], this.uVertices[k+1], this.uVertices[k + 1 + offset]);
            this.indices.push(k);
            this.indices.push(k+1);
            this.indices.push(k+1+offset);

            this.vertices.push(this.uVertices[k]);
            this.vertices.push(this.uVertices[k+1]);
            this.vertices.push(this.uVertices[k+1+offset]);

            this.uNormals[k] = add(ftn, this.uNormals[k]);
            this.uNormals[k+1] = add(ftn, this.uNormals[k+1]);
            this.uNormals[k+1+offset] = add(ftn, this.uNormals[k+1+offset]);

            var stn = Shape.computeNormal(this.uVertices[k], this.uVertices[k+1+offset], this.uVertices[k+offset]);
            this.indices.push(k);
            this.indices.push(k + offset);
            this.indices.push(k + 1 + offset);

            this.vertices.push(this.uVertices[k]);
            this.vertices.push(this.uVertices[k+1+offset]);
            this.vertices.push(this.uVertices[k+offset]);

            this.uNormals[k] = add(ftn, this.uNormals[k]);
            this.uNormals[k+1+offset] = add(ftn, this.uNormals[k+1+offset]);
            this.uNormals[k+offset] = add(ftn, this.uNormals[k+offset]);
        }
    }

    for (var knn = 0; knn < this.uNormals.length; knn++) {
        var curNormal = this.uNormals[knn];
        var nn = normalize(curNormal);
        this.uNormals[knn] = nn;
    }

    for (var k2 = 1; k2 <= n-1; k2++) {
        if(k2 === n-1) {
            this.normals.push(this.uNormals[k2]);
            this.normals.push(this.uNormals[1]);
            this.normals.push(this.uNormals[k2+offset]);
            this.normals.push(this.uNormals[1]);
            this.normals.push(this.uNormals[1+offset]);
            this.normals.push(this.uNormals[k2+offset]);
        } else {
            this.normals.push(this.uNormals[k2]);
            this.normals.push(this.uNormals[k2+1]);
            this.normals.push(this.uNormals[k2+1+offset]);
            this.normals.push(this.uNormals[k2]);
            this.normals.push(this.uNormals[k2+1+offset]);
            this.normals.push(this.uNormals[k2+offset]);
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
var Line = function(gl, start, end, lineColor) {
    this.modelViewMatrix = mat4();
    this.normalMatrix = mat4();
    this.diffuse = null;
    this.specular = null;
    this.materialDiffuse = null;
    this.materialSpecular = null;
    this.materialShininess = null;
    this.ambientProduct = null;
    this.diffuseProduct = null;
    this.specularProduct = null;
    this.globalAmbientProduct = null;

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

    this.program = initShaders(gl, "vertex-shader-line", "fragment-shader-line");
    this.color = lineColor;
/*
    this.update = function() {
        this.modelViewMatrix = mat4();
        this.normalMatrix = mat4();

        //this.color = colors[controls.Color];
        this.Diffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
        this.Specular = ColorUtils.hexToGLvec4(controls.Specular);
        //console.log(this.color);

        this.materialDiffuse = ColorUtils.hexToGLvec4(controls.Diffuse);
        this.materialSpecular = ColorUtils.hexToGLvec4(controls.Specular);
        this.materialShininess = controls.Shininess;

        this.ambientProduct = [];
        this.diffuseProduct = [];
        this.specularProduct = [];

        console.log(lightSources.length);
        for (var i = 0; i < lightSources.length; i++) {
            this.ambientProduct[i] = mult(lightSources[i].lightAmbient, this.color);
            this.diffuseProduct[i] = mult(lightSources[i].lightDiffuse, this.Diffuse);
            this.specularProduct[i] = mult(lightSources[i].lightSpecular, this.Specular);
        }
        this.globalAmbientProduct = mult(globalAmbientLight.lightAmbient, this.color);

        this.modelViewMatrix  = mult(this.modelViewMatrix, translate(this.translate[0], this.translate[1], this.translate[2]));
        this.modelViewMatrix = mult(this.modelViewMatrix, rotate(this.theta[0], [1, 0, 0]));
        this.modelViewMatrix = mult(this.modelViewMatrix, rotate(this.theta[1], [0, 1, 0]));
        this.modelViewMatrix = mult(this.modelViewMatrix, rotate(this.theta[2], [0, 0, 1]));

        this.modelViewMatrix = mult(this.modelViewMatrix, viewMatrix);

        this.normalMatrix = inverseMat3(flatten(this.modelViewMatrix));
        this.normalMatrix = transpose(this.normalMatrix);
    };
*/
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

        var pLoc = gl.getUniformLocation(this.program, 'p');

        var mvLoc = gl.getUniformLocation(this.program, 'mv');


        //var scaleLoc = gl.getUniformLocation(element.program, 'scale');
        var translateLoc = gl.getUniformLocation(this.program, 'translate');

        gl.uniform3fv(thetaLoc, this.theta);
        gl.uniform3fv(translateLoc, this.translate);

        gl.uniform4fv(colorLoc, this.color);


        gl.uniformMatrix4fv(pLoc, false, flatten(pMatrix));

        gl.uniformMatrix4fv(mvLoc, false, flatten(viewMatrix));

        console.log("Rendering line");
        gl.drawElements( gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        /*
        console.log("Rendering element");
        // draw first triangles fillde with color

        for( var i = 0; i < this.vertices.length; i+=3) {
            gl.drawArrays( gl.TRIANGLES, i, 3);
        }
        */

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
        element.update();
        element.render();
    }

    updateLightPosition();


    setTimeout(
        function() { requestAnimationFrame(render); },
        1000/60
    );

    //requestAnimationFrame(render);

};

var updateLightPosition = function() {
    if (Light.numEnabled(lightSources) > 0) {
        for (var i = 0; i < lightSources.length; i++) {
            var source = lightSources[i];
            if (source.lightAnimated) {
                if (source.rotation === 'INC') {
                    source.theta += 1;
                    source.gamma += 1;
                } else if (source.rotation === 'DEC') {
                    source.theta -= 1;
                    source.gamma -= 1;
                }
                if (source.theta >= 360 || source.theta <= -360) {
                    source.theta = 0.0;
                }

                if (source.gamma >= 360 || source.gamma <= -360) {
                    source.gamma = 0.0;
                }

                var rotatedPoint = Light.rotatePoint3D(source.initialPosition, source.theta, source.gamma);
                //var rotatedPoint = Light.rotatePoint2D(source.theta, 16);
                source.lightPosition[0] = rotatedPoint[0];

                source.lightPosition[1] = rotatedPoint[1];

                source.lightPosition[2] = rotatedPoint[2];



            }
        }
    }
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

    lightSources = [Light.defaultSource(),
    Light.alternateSource()];

    globalAmbientLight = Light.globalAmbient();

    if (!gl) { alert('WebGL is not available'); }

    controls = new function() {
        this.Type = "sphere";
        this.Color = "red";
        this.cameraRadius = 10;

        this.cameraTheta = 0;
        this.cameraPhi = 0;

        this.Radius = 1.0;
        this.Height = 1.0;
        this.X = 0.0;
        this.Y = 0.0;
        this.Z = 0.0;
        this.RotX = 45;
        this.RotY = 0;
        this.RotZ = 0;
        this.Diffuse = "#ffffff";
        this.Specular = "#ffffff";
        this.Shininess = 10.0;


        this.Light1On = false;
        this.AnimateLight1 = false;
        this.AmbientLight1 = "#ffffff";
        this.DiffuseLight1 = "#ffffff";
        this.SpecularLight1 = "#ffffff";
        this.DistanceLight1 = 0.0;


        this.Light2On = false;
        this.AnimateLight2 = false;
        this.AmbientLight2 = "#333333";
        this.DiffuseLight2 = "#ffdd05";
        this.SpecularLight2 = "#ffffff";
        this.DistanceLight2 = 0.0;

        this.AddElement = function() {

            var element = null;

            switch (this.Type) {
                case "sphere":
                    element = new Sphere(new vec3(this.X, this.Y, this.Z),
                        this.Radius, this.Height, new vec3(this.RotX,
                            this.RotY, this.RotZ));
                    element.update();
                    break;
                case "cone":
                    element = new Cone(new vec3(this.X, this.Y, this.Z),
                        this.Radius, this.Height, new vec3(this.RotX,
                            this.RotY, this.RotZ));
                    element.update();
                    break;
                case "cylinder":
                    element = new Cylinder(new vec3(this.X, this.Y, this.Z),
                        this.Radius, this.Height, new vec3(this.RotX,
                            this.RotY, this.RotZ));
                    element.update();
                    break;
            }

            elements.push(element);
            render();
        };
        this.ListElements = function() {
            for (var i = 0; i < elements.length; i++) {
                console.log(elements[i].toString());

            }
        };

        this.UpdateLight1 = function() {
            updateLightSources();

        };

        this.UpdateLight2 = function() {
            updateLightSources();

        };

    };

    gui = new dat.GUI();
    var customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    var element = gui.addFolder("Element");
    var types = element.add(controls, 'Type', ["sphere", "cone", "cylinder"]);


    var guiColors = element.add(controls, 'Color', ["black", "red", "yellow", "green", "blue", "magenta", "cyan"]);

    var radius = element.add(controls, 'Radius', 0.1, 10);
    var height = element.add(controls, 'Height', 0.1, 10);
    var X = element.add(controls, 'X', -10, 10);
    var Y = element.add(controls, 'Y', -10, 10);
    var Z = element.add(controls, 'Z', -10, 10);
    var RotX = element.add(controls, 'RotX', -180, 180);
    var RotY = element.add(controls, 'RotY', -180, 180);
    var rotZ = element.add(controls, 'RotZ', -180, 180);
    var diffuse = element.add(controls, 'Diffuse');
    var specular = element.add(controls, 'Specular');
    var shininess = element.add(controls, 'Shininess', 1, 50);
    var addElement = element.add(controls, 'AddElement');
    var listElements = element.add(controls, 'ListElements');


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


    var light1 = gui.addFolder("Light1");
    var lightSwitch1 = light1.add(controls, 'Light1On');
    var animatedLight1 = light1.add(controls, 'AnimateLight1');
    var lightAmbient1 = light1.add(controls, 'AmbientLight1');
    var lightDiffuse1 = light1.add(controls, 'DiffuseLight1');
    var lightSpecular1 = light1.add(controls, 'SpecularLight1');
    var lightDistance1 = light1.add(controls, 'DistanceLight1', 0, 3);
    var updateLight1 = light1.add(controls, 'UpdateLight1');

    var light2 = gui.addFolder("Light2");
    var lightSwitch2 = light2.add(controls, 'Light2On');
    var animatedLight2 = light2.add(controls, 'AnimateLight2');
    var lightAmbient2 = light2.add(controls, 'AmbientLight2');
    var lightDiffuse2 = light2.add(controls, 'DiffuseLight2');
    var lightSpecular2 = light2.add(controls, 'SpecularLight2');
    var lightDistance2 = light2.add(controls, 'DistanceLight2', 0, 3);
    var updateLight2 = light2.add(controls, 'UpdateLight2');



    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    //gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);


    xAxis = new Line(gl, new vec3(-100.0, 0.0, 0.0), new vec3(100.0, 0.0, 0.0), colors["red"]);
    yAxis = new Line(gl, new vec3(0.0, -100.0, 0.0), new vec3(0.0, 100.0, 0.0), colors["blue"]);
    zAxis = new Line(gl, new vec3(0.0, 0.0, -100.0), new vec3(0.0, 0.0, 100.0), colors["yellow"]);

    setupCamera();
    updateLightSources();


    render();


};
