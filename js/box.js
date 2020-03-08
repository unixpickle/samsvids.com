class BoxAnimation {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.soft = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.geometry = this._setupGeometry()
        this.material = new THREE.MeshLambertMaterial({ color: 0xdeb900 });
        this.material.side = THREE.DoubleSide;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        this.camera = null;

        const ambient = new THREE.AmbientLight(0x909090);
        this.scene.add(ambient);

        this.light = new THREE.DirectionalLight(0xffffff, (0xff - 0x90) / 0xff);
        this.light.position.set(0, 10, 10);
        this.light.target.position.set(0, 0, 0);
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.bias = -5e-5;
        this.scene.add(this.light);

        this.resize();
        this.container.appendChild(this.renderer.domElement);
    }

    resize() {
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;
        this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        this.camera.position.z = 4;
        this.renderer.setSize(w, h);
    }

    renderLoop() {
        let t = 0;
        setInterval(() => {
            this.renderAtTime(t);
            t += 1 / 24;
            if (t > 3) {
                t = 0;
            }
        }, 1000 / 24);
    }

    renderAtTime(t) {
        this._updatePosition(t);
        this._updateFlaps(t);
        this._updateNormals();

        this.renderer.render(this.scene, this.camera);
    }

    _updatePosition(t) {
        let fallFrac = Math.min(1, t / BoxAnimation.ANIMATE_DROP_TIME);
        fallFrac = 1 - Math.pow(1 - fallFrac, 2);
        const dropY = fallFrac * BoxAnimation.ANIMATE_DROP_BOTTOM +
            (1 - fallFrac) * BoxAnimation.ANIMATE_DROP_TOP;
        this.mesh.position.setY(dropY);
    }

    _flapThetas(t) {
        let frontFrac = Math.min(1, t / BoxAnimation.ANIMATE_FRONT_TIME);
        frontFrac = 1 - Math.pow(1 - frontFrac, 2);

        let sideFrac = Math.max(0, Math.min(1, (t - BoxAnimation.ANIMATE_SIDE_START) /
            BoxAnimation.ANIMATE_SIDE_TIME));
        sideFrac = 1 - Math.pow(1 - sideFrac, 2);

        const frontFlapTheta = 1.3 * Math.PI * frontFrac;
        const backFlapTheta = 1.3 * Math.PI * frontFrac;
        const leftFlapTheta = 1.3 * Math.PI * sideFrac;
        const rightFlapTheta = 1.3 * Math.PI * sideFrac;
        return { frontFlapTheta, backFlapTheta, leftFlapTheta, rightFlapTheta };
    }

    _updateFlaps(t) {
        const { frontFlapTheta, backFlapTheta, leftFlapTheta, rightFlapTheta } =
            this._flapThetas(t);

        const sideSize = BoxAnimation.SIDE_FLAP_SIZE;
        const frontSize = BoxAnimation.FRONT_FLAP_SIZE;

        // Left flap.
        this.geometry.vertices[8].x = -BoxAnimation.BOX_WIDTH / 2 +
            Math.cos(leftFlapTheta) * sideSize;
        this.geometry.vertices[8].y = BoxAnimation.BOX_HEIGHT / 2 +
            Math.sin(leftFlapTheta) * sideSize;
        this.geometry.vertices[8].z = BoxAnimation.BOX_DEPTH / 2;
        this.geometry.vertices[9].copy(this.geometry.vertices[8]);
        this.geometry.vertices[9].z = -BoxAnimation.BOX_DEPTH / 2;

        // Right flap.
        this.geometry.vertices[10].x = BoxAnimation.BOX_WIDTH / 2 -
            Math.cos(rightFlapTheta) * sideSize;
        this.geometry.vertices[10].y = BoxAnimation.BOX_HEIGHT / 2 +
            Math.sin(rightFlapTheta) * sideSize;
        this.geometry.vertices[10].z = BoxAnimation.BOX_DEPTH / 2;
        this.geometry.vertices[11].copy(this.geometry.vertices[10]);
        this.geometry.vertices[11].z = -BoxAnimation.BOX_DEPTH / 2;

        // Front flap.
        this.geometry.vertices[12].y = BoxAnimation.BOX_HEIGHT / 2 +
            Math.sin(frontFlapTheta) * frontSize;
        this.geometry.vertices[12].z = BoxAnimation.BOX_DEPTH / 2 -
            Math.cos(frontFlapTheta) * frontSize;
        this.geometry.vertices[12].x = BoxAnimation.BOX_WIDTH / 2;
        this.geometry.vertices[13].copy(this.geometry.vertices[12]);
        this.geometry.vertices[13].x = -BoxAnimation.BOX_WIDTH / 2;

        // Back flap.
        this.geometry.vertices[14].y = BoxAnimation.BOX_HEIGHT / 2 +
            Math.sin(backFlapTheta) * frontSize;
        this.geometry.vertices[14].z = -BoxAnimation.BOX_DEPTH / 2 +
            Math.cos(backFlapTheta) * frontSize;
        this.geometry.vertices[14].x = BoxAnimation.BOX_WIDTH / 2;
        this.geometry.vertices[15].copy(this.geometry.vertices[14]);
        this.geometry.vertices[15].x = -BoxAnimation.BOX_WIDTH / 2;

        this.geometry.verticesNeedUpdate = true;
    }

    _updateNormals() {
        this.geometry.normalsNeedUpdate = true;
        this.geometry.computeFaceNormals();

        // Make sure the normals point in the correct
        // direction to be lighted.
        this.geometry.faces.forEach((f) => {
            if (f.normal.z < 0) {
                [f.a, f.b] = [f.b, f.a];
            }
        });
        this.geometry.elementsNeedUpdate = true;
        this.geometry.normalsNeedUpdate = true;
        this.geometry.computeFaceNormals();
    }

    _setupGeometry() {
        const res = new THREE.Geometry();

        // Vertices for box sides.
        [-BoxAnimation.BOX_WIDTH, BoxAnimation.BOX_WIDTH].forEach((x) => {
            [-BoxAnimation.BOX_HEIGHT, BoxAnimation.BOX_HEIGHT].forEach((y) => {
                [-BoxAnimation.BOX_DEPTH, BoxAnimation.BOX_DEPTH].forEach((z) => {
                    res.vertices.push(new THREE.Vector3(x / 2, y / 2, z / 2));
                });
            });
        });

        // Faces for box sides.
        res.faces.push(
            // Back face.
            new THREE.Face3(6, 2, 4),
            new THREE.Face3(2, 0, 4),
            // Front face.
            new THREE.Face3(1, 5, 3),
            new THREE.Face3(3, 5, 7),
            // Left face.
            new THREE.Face3(0, 2, 1),
            new THREE.Face3(1, 2, 3),
            // Right face.
            new THREE.Face3(4, 5, 6),
            new THREE.Face3(5, 6, 7),
            // Bottom face.
            new THREE.Face3(0, 1, 4),
            new THREE.Face3(4, 5, 1),
        )

        // Vertices for tops of flaps.
        // These are updated by updateFlaps().
        for (let i = 0; i < 8; i++) {
            res.vertices.push(new THREE.Vector3(0, 0, 0));
        }

        // Faces for flaps.
        res.faces.push(
            // Left flap.
            new THREE.Face3(2, 3, 8),
            new THREE.Face3(8, 9, 2),
            // Right flap.
            new THREE.Face3(6, 7, 10),
            new THREE.Face3(10, 11, 6),
            // Front flap.
            new THREE.Face3(3, 7, 12),
            new THREE.Face3(12, 13, 3),
            // Back flap.
            new THREE.Face3(2, 6, 14),
            new THREE.Face3(14, 15, 2),
        );

        res.computeBoundingSphere();
        return res;
    }

    static get BOX_WIDTH() {
        return 2.5;
    }

    static get BOX_HEIGHT() {
        return 1.5;
    }

    static get BOX_DEPTH() {
        return 1.8;
    }

    static get SIDE_FLAP_SIZE() {
        return 0.5;
    }

    static get FRONT_FLAP_SIZE() {
        return BoxAnimation.BOX_DEPTH * 0.4;
    }

    static get ANIMATE_FRONT_TIME() {
        return 1.0;
    }

    static get ANIMATE_SIDE_START() {
        return 0.6;
    }

    static get ANIMATE_SIDE_TIME() {
        return 1.0;
    }

    static get ANIMATE_DROP_TIME() {
        return 3.0;
    }

    static get ANIMATE_DROP_TOP() {
        return 1.0;
    }

    static get ANIMATE_DROP_BOTTOM() {
        return -1.5;
    }
}