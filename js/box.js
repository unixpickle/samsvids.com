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
        this.camera.position.z = 7;
        this.renderer.setSize(w, h);
    }

    renderAtTime(t) {
        this.renderer.render(this.scene, this.camera);
    }

    _setupGeometry() {
        const res = new THREE.Geometry();

        // Vertices for box sides.
        [-BoxAnimation.BOX_WIDTH, BoxAnimation.BOX_WIDTH].forEach((x) => {
            [-BoxAnimation.BOX_HEIGHT, BoxAnimation.BOX_HEIGHT].forEach((y) => {
                [-BoxAnimation.BOX_DEPTH, BoxAnimation.BOX_DEPTH].forEach((z) => {
                    res.vertices.push(new THREE.Vector3(x, y, z));
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
        // for (const i = 0; i < 8; i++) {
        //     res.vertices.push(new THREE.Vector3(0, 0, 0));
        // }

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
}