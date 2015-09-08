/**
 * Created by Vesa on 1.9.2015.
 */
var canvas;
var gl;
var viewMatrix;
var gui;
var controls;
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var sphere = null;
var fovy = 45.0;
var program = null;
var light = null;
var checkerboardImage, pattern, fileImage;



var CheckBoard = function (size, numChecks) {

    this.size = size;
    this.numChecks = numChecks;
    this.image = new Uint8Array(4*size*size);

    var c = 0;
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            var patchx = Math.floor(i/(size/numChecks));
            var patchy = Math.floor(j/(size/numChecks));

            if (patchx%2 ^ patchy%2) c = 255;
            else c = 0;

            this.image[4*i*size + 4*j] = c;
            this.image[4*i*size + 4*j+1] = c;
            this.image[4*i*size + 4*j+2] = c;
            this.image[4*i*size + 4*j+3] = 255;

        }
    }

};

var Pattern = function(size) {

    this.size = size;
    this.image = new Uint8Array(4 * size * size);

    var c = 0;

    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            this.image[4 * i * size + 4 * j] = 127 + 127 * Math.sin(0.1 * i * j);
            this.image[4 * i * size + 4 * j + 1] = 127 + 127 * Math.sin(0.1 * i * j);
            this.image[4 * i * size + 4 * j + 1] = 127 + 127 * Math.sin(0.1 * i * j);
            this.image[4 * i * size + 4 * j + 3] = 255;
        }
    }

};

var Cube = function() {

    this.texCoord = [
        vec2(0, 0),
        vec2(0, 1),
        vec2(1, 1),
        vec2(1, 0)

    ];
};
var Light = function() {
    this.position = vec4(200.0, 300.0, 100.0, 0.0);
    this.ambient = vec4(0.2, 0.2, 0.2, 1.0);
    this.diffuse = vec4(1.0, 1.0, 1.0, 1.0);
    this.specular = vec4(1.0, 1.0, 1.0, 1.0);
};

var Sphere = function() {

    this.lats = 30;
    this.longs = 30;
    this.radius = 1.0;
    this.vertices = [];
    this.normals = [];
    this.texCoords = {
        spherical : [],
        cylindrical : [],
        planar : []
    };
    this.indices = [];
    this.modelViewMatrix = null;
    this.normalMatrix = null;
    this.theta = [45.0, 45.0, 45.0];
    this.Color = vec4(1.0, 1.0, 1.0, 1.0);

    this.materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
    this.materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
    this.materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
    this.materialShininess = 20.0;
    this.textureType = "CheckboardWithPattern";
    this.texture = null;
    this.texture2 = null;
    this.program = initShaders(gl, 'vertex-shader-tex', 'fragment-shader-tex');
    gl.useProgram(this.program);
    this.textureMappingMethod = "spherical";
    this.fileImage = null;
    this.mode = 0;

    this.checkerboardImage = null;
    this.pattern = null;

    this.ambientProduct = mult(light.ambient, this.materialAmbient);
    this.diffuseProduct = mult(light.diffuse, this.materialDiffuse);
    this.specularProduct = mult(light.specular, this.materialSpecular);


    for (var latIndex = 0; latIndex <= this.lats; ++latIndex) {
        for (var longIndex = 0; longIndex <= this.longs; ++longIndex) {
            var theta = latIndex * Math.PI / this.lats;
            var phi = longIndex * 2 * Math.PI / this.longs;
            var sinTheta = Math.sin(theta);
            var sinPhi = Math.sin(phi);
            var cosTheta = Math.cos(theta);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi *sinTheta;

            this.normals.push(x);
            this.normals.push(y);
            this.normals.push(z);


            this.texCoords.spherical.push(-(longIndex / this.longs));
            this.texCoords.spherical.push((latIndex / this.lats));

            this.texCoords.cylindrical.push(theta);
            this.texCoords.cylindrical.push(cosPhi);

            this.texCoords.planar.push(x);
            this.texCoords.planar.push(y);

            this.vertices.push(this.radius * x);
            this.vertices.push(this.radius * y);
            this.vertices.push(this.radius * z);

        }
    }

    for (var latIndex1 = 0; latIndex1 < this.lats; ++latIndex1) {
        for (var longIndex1 = 0; longIndex1 < this.longs; ++longIndex1) {
            var first = (latIndex1 * (this.longs + 1)) + longIndex1;
            var second = first + this.longs + 1;
            this.indices.push(first);
            this.indices.push(second);
            this.indices.push(first + 1);

            this.indices.push(second);
            this.indices.push(second+1);
            this.indices.push(first + 1);
        }
    }


    this.buildModelViewMatrix = function() {
        var modelMatrix = mat4();

        modelMatrix = mult(rotate(this.theta[0], [1, 0, 0]), modelMatrix);
        modelMatrix = mult(rotate(this.theta[1], [0, 1, 0]), modelMatrix);
        modelMatrix = mult(rotate(this.theta[2], [0, 0, 1]), modelMatrix);

        var mv = mult(viewMatrix, modelMatrix);

        this.normalMatrix = inverseMat3(flatten(mv));
        this.normalMatrix = transpose(this.normalMatrix);
        this.modelViewMatrix = mv;

    };

    this.configureTexture = function() {

        if (controls.TextureType === "EarthFromFile") {
            this.fileTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, this.fileTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.fileImage);

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 0);
        }

        if (controls.TextureType === "CheckboardWithPattern") {
            this.checkTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, this.checkTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,this.checkerboardImage.size, this.checkerboardImage.size,
                0, gl.RGBA, gl.UNSIGNED_BYTE, this.checkerboardImage.image );

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.uniform1i(gl.getUniformLocation(this.program, 'Tex0'), 0);

            this.patternTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, this.patternTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,this.pattern.size, this.pattern.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.pattern.image );

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.uniform1i(gl.getUniformLocation(this.program, 'Tex1'), 1);
        }

    };

    this.render = function() {
        var vBuffer, vPosition;

        if (this.textureType === "reflection") {
            this.program = initShaders(gl, 'vertex-shader', 'fragment-shader');
            gl.useProgram(this.program);

            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'projectionMatrix'), false, flatten(pMatrix));

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'modelViewMatrix'), false, flatten(this.modelViewMatrix));

            var nBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

            var vNormal = gl.getAttribLocation(this.program, "vNormal");
            gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vNormal);


            vBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

            var iBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

            var vPosition = gl.getAttribLocation(this.program, "vPosition");
            gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            gl.uniformMatrix3fv(gl.getUniformLocation(this.program, "normalMatrix"), false, flatten(this.normalMatrix));

            gl.uniform4fv(gl.getUniformLocation(this.program, "ambientProduct"), flatten(this.ambientProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, "diffuseProduct"), flatten(this.diffuseProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, "specularProduct"), flatten(this.specularProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, "lightPosition"), flatten(light.position));
            gl.uniform1f(gl.getUniformLocation(this.program, "shininess"), this.materialShininess);
        } else {
            this.program = initShaders(gl, 'vertex-shader-tex', 'fragment-shader-tex');
            gl.useProgram(this.program);


            if (controls.TextureType === 'CheckboardWithPattern') {
                this.mode = 1;
            }


            if (controls.TextureType === 'EarthFromFile') {
                this.mode = 0;
            }


            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


            var nBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

            var vNormal = gl.getAttribLocation(this.program, 'vNormal');
            gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vNormal);

            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'projectionMatrix'), false, flatten(pMatrix));

            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'modelViewMatrix'), false, flatten(this.modelViewMatrix));

            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'viewMatrix'), false, flatten(viewMatrix));

            var iBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

            var vBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

            var vPosition = gl.getAttribLocation(this.program, 'vPosition');
            gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            var tBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(this.texCoords[controls.CoordinateMapType]), gl.STATIC_DRAW);

            var vTexCoord = gl.getAttribLocation(this.program, 'vTexCoord');
            gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vTexCoord);

            var normalMatrixLoc = gl.getUniformLocation(this.program, 'normalMatrix');
            gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(this.normalMatrix));

            gl.uniform4fv(gl.getUniformLocation(this.program, 'ambientProduct'), flatten(this.ambientProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, 'diffuseProduct'), flatten(this.diffuseProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, 'specularProduct'), flatten(this.specularProduct));
            gl.uniform4fv(gl.getUniformLocation(this.program, 'lightPosition'), flatten(light.position));
            gl.uniform1f(gl.getUniformLocation(this.program, 'shininess'), flatten(this.materialShininess));


            //gl.uniform4fv(gl.getUniformLocation(this.program, 'fColor'), flatten(this.Color));

            // Send mode to renderer
            gl.uniform1i(gl.getUniformLocation(this.program, 'mode'), this.mode);

        }

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

    };

};


var buildViewMatrix = function() {
    var at = vec3(0, 0, 0);
    var up = vec3(0.0, 1.0, 0.0);
    var eye = vec3(
        controls.zoom * Math.sin(radians(controls.theta)) * Math.cos(radians(controls.phi)),
        controls.zoom * Math.sin(radians(controls.theta)) * Math.sin(radians(controls.phi)),
        controls.zoom * Math.cos(radians(controls.theta))
    );

    viewMatrix = lookAt(eye, at, up);

    pMatrix = perspective(fovy, canvas.width/canvas.height, 0.1, 100);
};

var handleMouseDown = function(evt) {
    mouseDown = true;
    lastMouseX = evt.clientX;
    lastMouseY = evt.clientY;
};

var handleMouseUp = function() {
    mouseDown = false;
};

var handleMouseMove = function(evt) {
    if (!mouseDown) {
        return;
    }
    var newX = evt.clientX;
    var newY = evt.clientY;

    var deltaX = newX - lastMouseX;
    sphere.theta[1] -= deltaX / 10;

    var deltaY = newY - lastMouseY;
    sphere.theta[0] -= deltaY / 10;

    render();
};

var render = function() {

    sphere.buildModelViewMatrix();
    sphere.configureTexture();
    sphere.render();

    /*
    setTimeout(
        function() { requestAnimationFrame( render);},
        1000/60
    );
    */
};


var loadTextureFile = function(textureFileUrl) {
    sphere.fileImage = new Image();
    sphere.fileImage.onload = function() {
        sphere.configureTexture(sphere.fileImage);
        render();
    };
    sphere.fileImage.onerror = function() {
        console.error('Unable to load image: ' + textureFileUrl);
    };
    sphere.fileImage.src = textureFileUrl;
};
window.onload = function() {

    canvas = document.getElementById('gl-canvas');
    gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true});
    if (!gl) { alert('WebGL is not available'); }

    controls = new function() {
        this.zoom = 4;
        this.theta = 0;
        this.phi = 0;

        this.CoordinateMapType = "spherical";

        this.TextureType = "CheckboardWithPattern";

    };

    gui = new dat.GUI();
    var customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);

    var camera = gui.addFolder("Camera");
    var cameraZoomController = camera.add(controls, 'zoom', 0, 30);
    var cameraThetaController = camera.add(controls, 'theta', -180, 180);
    var cameraPhiController = camera.add(controls, 'phi', -180, 180);

    var coordMode = gui.addFolder("Coordinate Map");
    var coordMapController = coordMode.add(controls, 'CoordinateMapType', ["spherical", "cylindrical", "planar"]);
    coordMapController.onChange(function(value) {
        render();
    });

    var textureMode = gui.addFolder("Texture Mode");
    var textureController = textureMode.add(controls, 'TextureType', ["CheckboardWithPattern", "EarthFromFile"]);
    textureController.onChange(function(value) {
        render();
    });

    cameraZoomController.onFinishChange(function(value) {
        buildViewMatrix();
        render();
    });
    cameraThetaController.onFinishChange(function(value) {
        buildViewMatrix();
        render();
    });
    cameraPhiController.onFinishChange(function(value) {
        buildViewMatrix();
        render();
    });

    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    light = new Light();
    sphere = new Sphere();
    buildViewMatrix();
    sphere.buildModelViewMatrix();

    sphere.checkerboardImage = new CheckBoard(512, 8);
    sphere.pattern = new Pattern(512);

    loadTextureFile('./Resources/land_shallow_topo_1024.jpg');

    render();

};

