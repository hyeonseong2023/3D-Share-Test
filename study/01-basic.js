import * as THREE from '../build/three.module.js';

class App {
    constructor() {
        const divContainer = document.querySelector('#webgl-container');
        this._divContainer = divContainer;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        divContainer.appendChild(renderer.domElement);
        this._renderer = renderer;

        const scene = new THREE.Scene();
        this._scene = scene;

        this._setupCamera();
        this._setupLight();
        this._setupModel();
        
        window.onresize = this.resize.bind(this);
        this.resize();

        this._isAnimating = true;
        this._animationId = null;

        this._renderer.render(this._scene, this._camera);

        this._animationId = requestAnimationFrame(this.render.bind(this));

        document.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.toggleAnimation();
            }
        });

        const saveButton = document.getElementById('save-screenshot');
        saveButton.addEventListener('click', () => this.saveScreenshot());

        const copyButton = document.getElementById('copy-clipboard');
        copyButton.addEventListener('click', () => this.copyToClipboard());

        const kakaoButton = document.getElementById('kakao-share');
        kakaoButton.addEventListener('click', () => this.shareToKakao());

        Kakao.init('4ccb4d33fdc36870c91bf15f8ceeb9a1');
    }

    _setupCamera() {
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;
        const camera = new THREE.PerspectiveCamera(
            75, 
            width / height, 
            0.1, 
            100
        );
        camera.position.z = 2;
        this._camera = camera;
    }

    _setupLight() {
        const color = 0xffffff;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        this._scene.add(light);
    }

    _setupModel() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x44a88 });

        const cube = new THREE.Mesh(geometry, material);

        this._scene.add(cube);
        this._cube = cube;

        // 배경색 설정
        this._scene.background = new THREE.Color(0xffffff);
    }

    resize() {
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

        this._renderer.setSize(width, height);
    }

    render(time) {
        this._renderer.render(this._scene, this._camera);
        this.update(time);
        if (this._isAnimating) {
            this._animationId = requestAnimationFrame(this.render.bind(this));
        }
    }

    update(time) {
        time *= 0.001;
        this._cube.rotation.x = time;
        this._cube.rotation.y = time;        
    }

    startAnimation() {
        if (!this._isAnimating) {
            this._isAnimating = true;
            this._animationId = requestAnimationFrame(this.render.bind(this));
        }
    }

    stopAnimation() {
        if (this._isAnimating) {
            this._isAnimating = false;
            if (this._animationId) {
                cancelAnimationFrame(this._animationId);
            }
        }
    }

    toggleAnimation() {
        if (this._isAnimating) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }

    saveScreenshot() {
        // 현재 시간을 파일명에 포함
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;

        // 현재 프레임을 렌더링
        this._renderer.render(this._scene, this._camera);

        // 캔버스에서 이미지 데이터 URL 생성
        const imageData = this._renderer.domElement.toDataURL('image/png');

        // 다운로드 링크 생성
        const link = document.createElement('a');
        link.href = imageData;
        link.download = filename;
        link.click();

        // 알림 표시
        alert('스크린샷이 저장되었습니다!');
    }

    async copyToClipboard() {
        try {
            // 현재 프레임을 렌더링
            this._renderer.render(this._scene, this._camera);

            // 캔버스에서 Blob 객체 생성
            const canvas = this._renderer.domElement;
            canvas.toBlob(async (blob) => {
                try {
                    // 클립보드 API가 존재하는지 확인
                    if (!navigator.clipboard) {
                        throw new Error('클립보드 API를 지원하지 않습니다.');
                    }

                    // 클립보드에 이미지 복사
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);
                    alert('클립보드에 복사되었습니다!');
                } catch (error) {
                    console.error('클립보드 복사 실패:', error);
                    alert('클립보드 복사에 실패했습니다.');
                }
            }, 'image/png');
        } catch (error) {
            console.error('이미지 생성 실패:', error);
            alert('이미지 생성에 실패했습니다.');
        }
    }

    async shareToKakao() {
        try {
            const githubPagesUrl = 'https://hyeonseong2023.github.io/3D-Share-Test';
            const imageUrl = `${githubPagesUrl}/study/images/flower.png`;

            // 카카오톡 공유
            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: '봄의 감성을 담은 분홍 꽃다발💐',
                    description: '#핑크무드 #고백선물 #향기한줌 #설렘가득',
                    imageUrl: imageUrl,
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href,
                    },
                },
                buttons: [
                    {
                        title: '꽃다발 감상하기',
                        link: {
                            mobileWebUrl: window.location.href,
                            webUrl: window.location.href,
                        },
                    }
                ],
            });
        } catch (error) {
            console.error('카카오톡 공유 실패:', error);
            alert('카카오톡 공유에 실패했습니다.');
        }
    }
}

window.onload = () => {
    new App();
}