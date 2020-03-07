class BoxAnimation {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.geometry = this._setupGeometry()
        this.material = new THREE.MeshBasicMaterial({ color: 0xdeb900 });
        this.material.side = THREE.DoubleSide;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
        this.camera = null;

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

    renderAtTime(t) {
        this._updateFlaps(t);
        this.geometry.computeBoundingSphere();

        this.renderer.render(this.scene, this.camera);
    }

    _updateFlaps(t) {
        // TODO: calculate this based on t.
        const leftFlapTheta = 0;
        const rightFlapTheta = 0;
        const frontFlapTheta = 0;
        const backFlapTheta = 0;

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
        return 2;
    }

    static get BOX_HEIGHT() {
        return 1.5;
    }

    static get BOX_DEPTH() {
        return 2;
    }

    static get SIDE_FLAP_SIZE() {
        return 0.5;
    }

    static get FRONT_FLAP_SIZE() {
        return BoxAnimation.BOX_DEPTH * 0.4;
    }
}