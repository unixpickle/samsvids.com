class BoxPresenter {
    constructor(element) {
        this.element = element;
        this.clipContainer = document.createElement('div');
        this.clipContainer.className = 'box-presenter-clip';
        this.clipContainer.style.overflow = 'hidden';
        this.clipContainer.style.position = 'absolute';
        this.clipContainer.appendChild(this.element);

        this.container = document.createElement('div');
        this.container.className = 'box-presenter';

        this.rearBox = new BoxRenderer(this.container, false);
        this.container.appendChild(this.clipContainer);
        this.frontBox = new BoxRenderer(this.container, true);

        this.currentTime = 0;
    }

    animate() {
        let start = null;
        const f = (t) => {
            if (start === null) {
                start = t;
            }
            const curTime = (t - start) / 1000;
            this.render(curTime);
            if (curTime < BoxPresenter.TOTAL_TIME) {
                requestAnimationFrame(f);
            } else {
                this._completeAnimation();
            }
        };
        this.render(0);
        requestAnimationFrame(f);
    }

    _completeAnimation() {
        // Move the front box, but not the video, since
        // the video will reload if we remove and re-add
        // it (causing a twitch).
        this.frontBox.parentNode.removeChild(this.frontBox);
        this.container.insertBefore(this.frontBox, this.clipContainer);
    }

    // Update the size of the presenter to contain the
    // presented element.
    resize() {
        const width = BoxPresenter.WIDTH_RATIO * this.element.offsetWidth;
        const height = BoxPresenter.HEIGHT_RATIO * width;

        this.container.style.width = Math.ceil(width) + 'px';
        this.container.style.height = Math.ceil(height) + 'px';
        this.clipContainer.style.left = Math.round(width / 2 - this.element.offsetWidth / 2) + 'px';

        this.rearBox.resize();
        this.frontBox.resize();

        this.render(this.currentTime);
    }

    render(t) {
        this.currentTime = t;
        this.rearBox.render(t);
        this.frontBox.render(t);
        this._updateClip(t);
    }

    _updateClip(t) {
        const height = this.container.offsetHeight;
        let frac = Math.max(0, Math.min(1, (t - BoxPresenter.ANIMATE_Y_START) /
            BoxPresenter.ANIMATE_Y_TIME));

        // Two-sided easing.
        frac = (Math.sin((frac * 2 - 1) * Math.PI / 2) + 1) / 2;

        const y = height * ((1 - frac) * BoxPresenter.ANIMATE_INIT_Y +
            frac * BoxPresenter.ANIMATE_FINAL_Y);

        const maxY = this.frontBox.maxY();
        this.clipContainer.style.top = Math.round(y) + 'px';
        this.clipContainer.style.height = Math.max(0, Math.floor(maxY - y)) + 'px';
    }

    static get WIDTH_RATIO() {
        return 1.8;
    }

    static get HEIGHT_RATIO() {
        return 1;
    }

    static get ANIMATE_INIT_Y() {
        return 0.4;
    }

    static get ANIMATE_FINAL_Y() {
        return 0;
    }

    static get ANIMATE_Y_START() {
        return 1.4;
    }

    static get ANIMATE_Y_TIME() {
        return 1.0;
    }

    static get TOTAL_TIME() {
        return BoxRenderer.ANIMATE_DROP_TIME;
    }
}

class BoxRenderer {
    constructor(container, isFront) {
        this.container = container;
        this.isFront = isFront;

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ alpha: true });

        if (this.isFront) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.soft = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        this.geometry = this._setupGeometry()
        this.material = new THREE.MeshLambertMaterial({ color: 0xdeb900 });
        this.material.side = THREE.DoubleSide;
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        if (this.isFront) {
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }

        this.scene.add(this.mesh);
        this.camera = null;

        const ambient = new THREE.AmbientLight(0x909090);
        this.scene.add(ambient);

        this.light = new THREE.DirectionalLight(0xffffff, (0xff - 0x90) / 0xff);
        this.light.position.set(0, 10, 10);
        this.light.target.position.set(0, 0, 0);

        if (this.isFront) {
            this.light.castShadow = true;
            this.light.shadow.mapSize.width = 1024;
            this.light.shadow.mapSize.height = 1024;
            this.light.shadow.bias = -1e-4;
        }

        this.scene.add(this.light);

        this.resize();

        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.container.appendChild(this.renderer.domElement);
    }

    // Update the size of the renderer to match the
    // container.
    resize() {
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;

        const virtualH = h + w * BoxRenderer.TOP_VIEW_OFFSET;
        const horizFov = 50 * Math.PI / 180;
        const verticalFov = 2 * Math.atan(virtualH / w * Math.tan(horizFov / 2));
        this.camera = new THREE.PerspectiveCamera(verticalFov * 180 / Math.PI,
            w / virtualH, 0.1, 1000);

        // We want to make it so that the box just barely fits
        // into the canvas.
        const span = BoxRenderer.BOX_WIDTH + BoxRenderer.SIDE_FLAP_SIZE * 2 +
            BoxRenderer.SIDE_SLACK;
        this.camera.position.z = BoxRenderer.BOX_DEPTH / 2 + span / (2 * Math.tan(horizFov / 2));
        this.camera.setViewOffset(w, virtualH,
            0, w * BoxRenderer.TOP_VIEW_OFFSET, w, h);

        this.renderer.setSize(w, h);
    }

    // Render the part of the box at the given time in the
    // animation.
    render(t) {
        this._updatePosition(t);
        this._updateFlaps(t);
        this._updateNormals();

        this.renderer.render(this.scene, this.camera);
    }

    // Get the 2D y value of the lowest vertex of the box,
    // relative to the top-left corner of the container.
    maxY() {
        const height = this.container.offsetHeight;
        let maxY = 0;
        this.geometry.faces.forEach((f) => {
            [f.a, f.b, f.c].forEach((vIdx) => {
                const proj = this.geometry.vertices[vIdx].clone();
                proj.add(this.mesh.position);
                proj.project(this.camera);

                const y = height / 2 - (proj.y * height / 2);
                maxY = Math.max(maxY, y);
            });
        });
        return maxY
    }

    _updatePosition(t) {
        let fallFrac = Math.min(1, t / BoxRenderer.ANIMATE_DROP_TIME);
        fallFrac = 1 - Math.pow(1 - fallFrac, 2);
        const dropY = fallFrac * BoxRenderer.ANIMATE_DROP_BOTTOM +
            (1 - fallFrac) * BoxRenderer.ANIMATE_DROP_TOP;
        this.mesh.position.setY(dropY);
    }

    _flapThetas(t) {
        let frontFrac = Math.min(1, t / BoxRenderer.ANIMATE_FRONT_TIME);
        frontFrac = 1 - Math.pow(1 - frontFrac, 2);

        let sideFrac = Math.max(0, Math.min(1, (t - BoxRenderer.ANIMATE_SIDE_START) /
            BoxRenderer.ANIMATE_SIDE_TIME));
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

        const sideSize = BoxRenderer.SIDE_FLAP_SIZE;
        const frontSize = BoxRenderer.FRONT_FLAP_SIZE;

        // Left flap.
        this.geometry.vertices[8].x = -BoxRenderer.BOX_WIDTH / 2 +
            Math.cos(leftFlapTheta) * sideSize;
        this.geometry.vertices[8].y = BoxRenderer.BOX_HEIGHT / 2 +
            Math.sin(leftFlapTheta) * sideSize;
        this.geometry.vertices[8].z = BoxRenderer.BOX_DEPTH / 2;
        this.geometry.vertices[9].copy(this.geometry.vertices[8]);
        this.geometry.vertices[9].z = -BoxRenderer.BOX_DEPTH / 2;

        // Right flap.
        this.geometry.vertices[10].x = BoxRenderer.BOX_WIDTH / 2 -
            Math.cos(rightFlapTheta) * sideSize;
        this.geometry.vertices[10].y = BoxRenderer.BOX_HEIGHT / 2 +
            Math.sin(rightFlapTheta) * sideSize;
        this.geometry.vertices[10].z = BoxRenderer.BOX_DEPTH / 2;
        this.geometry.vertices[11].copy(this.geometry.vertices[10]);
        this.geometry.vertices[11].z = -BoxRenderer.BOX_DEPTH / 2;

        // Front flap.
        this.geometry.vertices[12].y = BoxRenderer.BOX_HEIGHT / 2 +
            Math.sin(frontFlapTheta) * frontSize;
        this.geometry.vertices[12].z = BoxRenderer.BOX_DEPTH / 2 -
            Math.cos(frontFlapTheta) * frontSize;
        this.geometry.vertices[12].x = BoxRenderer.BOX_WIDTH / 2;
        this.geometry.vertices[13].copy(this.geometry.vertices[12]);
        this.geometry.vertices[13].x = -BoxRenderer.BOX_WIDTH / 2;

        // Back flap.
        this.geometry.vertices[14].y = BoxRenderer.BOX_HEIGHT / 2 +
            Math.sin(backFlapTheta) * frontSize;
        this.geometry.vertices[14].z = -BoxRenderer.BOX_DEPTH / 2 +
            Math.cos(backFlapTheta) * frontSize;
        this.geometry.vertices[14].x = BoxRenderer.BOX_WIDTH / 2;
        this.geometry.vertices[15].copy(this.geometry.vertices[14]);
        this.geometry.vertices[15].x = -BoxRenderer.BOX_WIDTH / 2;

        this.geometry.verticesNeedUpdate = true;
    }

    _updateNormals() {
        this.geometry.normalsNeedUpdate = true;
        this.geometry.computeFaceNormals();

        // Make sure the normals point in the correct
        // direction to be lighted.
        this.geometry.faces.forEach((f) => {
            const corner = this.geometry.vertices[f.a].clone();
            corner.applyMatrix4(this.mesh.matrixWorld);
            const diff = corner.sub(this.camera.position);
            if (f.normal.dot(diff) > 0) {
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
        [-BoxRenderer.BOX_WIDTH, BoxRenderer.BOX_WIDTH].forEach((x) => {
            [-BoxRenderer.BOX_HEIGHT, BoxRenderer.BOX_HEIGHT].forEach((y) => {
                [-BoxRenderer.BOX_DEPTH, BoxRenderer.BOX_DEPTH].forEach((z) => {
                    res.vertices.push(new THREE.Vector3(x / 2, y / 2, z / 2));
                });
            });
        });

        // Faces for box sides.
        if (this.isFront) {
            res.faces.push(
                // Front face.
                new THREE.Face3(1, 5, 3),
                new THREE.Face3(3, 5, 7),
            );
        } else {
            res.faces.push(
                // Back face.
                new THREE.Face3(6, 2, 4),
                new THREE.Face3(2, 0, 4),
                // Left face.
                new THREE.Face3(0, 2, 1),
                new THREE.Face3(1, 2, 3),
                // Right face.
                new THREE.Face3(4, 5, 6),
                new THREE.Face3(5, 6, 7),
                // Bottom face.
                new THREE.Face3(0, 1, 4),
                new THREE.Face3(4, 5, 1),
            );
        }

        // Vertices for tops of flaps.
        // These are updated by updateFlaps().
        for (let i = 0; i < 8; i++) {
            res.vertices.push(new THREE.Vector3(0, 0, 0));
        }

        // Faces for flaps.
        if (this.isFront) {
            res.faces.push(
                // Front flap.
                new THREE.Face3(3, 7, 12),
                new THREE.Face3(12, 13, 3),
            );
        } else {
            res.faces.push(
                // Left flap.
                new THREE.Face3(2, 3, 8),
                new THREE.Face3(8, 9, 2),
                // Right flap.
                new THREE.Face3(6, 7, 10),
                new THREE.Face3(10, 11, 6),
                // Back flap.
                new THREE.Face3(2, 6, 14),
                new THREE.Face3(14, 15, 2),
            );
        }

        res.computeBoundingSphere();
        return res;
    }

    static get TOP_VIEW_OFFSET() {
        return 0.4;
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

    static get SIDE_SLACK() {
        return 0.3;
    }

    static get SIDE_FLAP_SIZE() {
        return 0.5;
    }

    static get FRONT_FLAP_SIZE() {
        return BoxRenderer.BOX_DEPTH * 0.4;
    }

    static get ANIMATE_FRONT_TIME() {
        return 1.0;
    }

    static get ANIMATE_SIDE_START() {
        return 0.8;
    }

    static get ANIMATE_SIDE_TIME() {
        return 1.0;
    }

    static get ANIMATE_DROP_TIME() {
        return 3.0;
    }

    static get ANIMATE_DROP_TOP() {
        return -0.3;
    }

    static get ANIMATE_DROP_BOTTOM() {
        return -1.5;
    }
}
