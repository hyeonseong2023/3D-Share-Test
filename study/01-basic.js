import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// Supabase 클라이언트 초기화
const supabaseUrl = 'https://oolkuscvkgdziqfysead.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbGt1c2N2a2dkemlxZnlzZWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NTg0ODIsImV4cCI6MjA1NTMzNDQ4Mn0.WB7fxsUxVSoAjY_EcwHHrG06dVfqdFrEITzWQA_ixjY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class App {

	constructor() {

		const divContainer = document.querySelector( '#webgl-container' );
		this._divContainer = divContainer;

		const renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		divContainer.appendChild( renderer.domElement );
		this._renderer = renderer;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff); // 배경색을 흰색으로 설정
		this._scene = scene;

		this._setupCamera();
		this._setupLight();
		this._models = []; // 여러 모델을 저장할 배열

		window.onresize = this.resize.bind( this );
		this.resize();

		this._isAnimating = true;
		this._animationId = null;

		this._renderer.render( this._scene, this._camera );

		this._animationId = requestAnimationFrame( this.render.bind( this ) );

		// Supabase 데이터 로드
		this._loadModelsFromSupabase();

		document.addEventListener( 'keydown', ( event ) => {

			if ( event.key === ' ' ) {

				this.toggleAnimation();

			}

		} );

		const saveButton = document.getElementById( 'save-screenshot' );
		saveButton.addEventListener( 'click', () => this.saveScreenshot() );

		const copyButton = document.getElementById( 'copy-clipboard' );
		copyButton.addEventListener( 'click', () => this.copyToClipboard() );

		const kakaoButton = document.getElementById( 'kakao-share' );
		kakaoButton.addEventListener( 'click', () => this.shareToKakao() );

		Kakao.init( '4ccb4d33fdc36870c91bf15f8ceeb9a1' );

		// OrbitControls 추가
		const controls = new OrbitControls(this._camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
		controls.minDistance = 3;
		controls.maxDistance = 20;
		controls.maxPolarAngle = Math.PI / 2;

		// TransformControls 추가
		const transformControls = new TransformControls(this._camera, renderer.domElement);
		transformControls.addEventListener('dragging-changed', (event) => {
			controls.enabled = !event.value;
		});
		this._scene.add(transformControls);
		this._transformControls = transformControls;

		// 모델 클릭 이벤트 추가
		renderer.domElement.addEventListener('click', (event) => {
			const raycaster = new THREE.Raycaster();
			const mouse = new THREE.Vector2();
			
			// 클릭 위치 계산
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			
			raycaster.setFromCamera(mouse, this._camera);
			
			// 모델과의 교차 검사
			const intersects = raycaster.intersectObjects(this._models, true);
			
			if (intersects.length > 0) {
				const object = intersects[0].object;
				// 가장 가까운 모델 찾기
				let model = object;
				while (model.parent && model.parent !== this._scene) {
					model = model.parent;
				}
				if (this._models.includes(model)) {
					transformControls.attach(model);
				}
			}
		});

		// ESC 키로 TransformControls 해제
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				transformControls.detach();
			}
		});

		// 모드 전환 버튼 추가
		const modeButtons = document.createElement('div');
		modeButtons.style.position = 'absolute';
		modeButtons.style.top = '20px';
		modeButtons.style.left = '20px';
		modeButtons.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
		modeButtons.style.padding = '10px';
		modeButtons.style.borderRadius = '5px';
		modeButtons.style.zIndex = '3';

		const translateButton = document.createElement('button');
		translateButton.textContent = '이동';
		translateButton.onclick = () => transformControls.setMode('translate');
		modeButtons.appendChild(translateButton);

		const rotateButton = document.createElement('button');
		rotateButton.textContent = '회전';
		rotateButton.onclick = () => transformControls.setMode('rotate');
		modeButtons.appendChild(rotateButton);

		const scaleButton = document.createElement('button');
		scaleButton.textContent = '크기';
		scaleButton.onclick = () => transformControls.setMode('scale');
		modeButtons.appendChild(scaleButton);

		document.body.appendChild(modeButtons);

	}

	async _loadModelsFromSupabase() {

		try {
			console.log('Supabase에서 데이터 로드 시작...');
			const { data, error } = await supabase
				.from('models')
				.select('*');

			if (error) throw error;

			console.log('가져온 모델 데이터:', data);

			// 각 모델을 로드하고 배치
			const loader = new GLTFLoader();
			const modelCount = data.length;
			const gridSize = Math.ceil(Math.sqrt(modelCount));
			const spacing = 5; // 모델 간 간격

			for (let i = 0; i < modelCount; i++) {
				const modelData = data[i];
				console.log(`모델 ${i + 1} 로드 시도:`, modelData.file_path);
				
				const row = Math.floor(i / gridSize);
				const col = i % gridSize;
				
				try {
					const gltf = await loader.loadAsync(modelData.file_path);
					console.log(`모델 ${i + 1} GLTF 로드 완료:`, gltf);
					
					const model = gltf.scene;
					
					// 모델 위치 설정 (그리드 형태로 배치)
					model.position.set(
						(col - (gridSize - 1) / 2) * spacing,
						0,
						(row - (gridSize - 1) / 2) * spacing
					);
					
					// 모델 크기 설정
					const box = new THREE.Box3().setFromObject(model);
					const size = box.getSize(new THREE.Vector3());
					const maxSize = Math.max(size.x, size.y, size.z);
					const scale = 3.0 / maxSize;  // 2.0에서 3.0으로 변경하여 크기를 3배로 증가
					model.scale.set(scale, scale, scale);
					
					// 모델의 재질 설정
					model.traverse((object) => {
						if (object.isMesh) {
							object.material.metalness = 0.3;
							object.material.roughness = 0.7;
							object.material.needsUpdate = true;
						}
					});
					
					// 두 번째 모델(꽃다발)의 경우 파스텔 핑크 색상 적용
					if (i === 1) {
						model.traverse((child) => {
							if (child.isMesh) {
								const geometry = child.geometry;
								const position = geometry.attributes.position;
								const colors = new Float32Array(position.count * 3);
								
								// 파스텔 핑크 색상 설정 (RGB: 1.0, 0.7, 0.8)
								for (let i = 0; i < position.count; i++) {
									colors[i * 3] = 1.0;     // R
									colors[i * 3 + 1] = 0.7; // G
									colors[i * 3 + 2] = 0.8; // B
								}
								
								geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
								
								// 머티리얼 설정
								const material = child.material.clone();
								material.vertexColors = true;
								material.needsUpdate = true;
								child.material = material;
							}
						});
					}
					
					this._scene.add(model);
					this._models.push(model);
					console.log(`모델 ${i + 1} 씬에 추가 완료`);
				} catch (error) {
					console.error(`모델 ${i + 1} 로드 실패:`, error);
				}
			}
		} catch (error) {
			console.error('Supabase 데이터 로드 실패:', error);
		}

	}

	_setupCamera() {

		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;
		const camera = new THREE.PerspectiveCamera(
			75,  // FOV를 더 넓게
			width / height,
			0.1,
			1000
		);
		camera.position.set(0, 10, 15);  // 카메라를 더 멀리
		camera.lookAt(0, 0, 0);
		this._camera = camera;

	}

	_setupLight() {

		// 메인 조명 강화
		const mainLight = new THREE.DirectionalLight(0xffffff, 2);
		mainLight.position.set(0, 10, 10);
		this._scene.add(mainLight);

		// 전면 조명 추가
		const frontLight = new THREE.DirectionalLight(0xffffff, 1);
		frontLight.position.set(0, 0, 10);
		this._scene.add(frontLight);

		// 후면 조명 추가
		const backLight = new THREE.DirectionalLight(0xffffff, 1);
		backLight.position.set(0, 0, -10);
		this._scene.add(backLight);

		// 환경광 강화
		const ambientLight = new THREE.AmbientLight(0xffffff, 1);
		this._scene.add(ambientLight);

	}

	resize() {

		const width = this._divContainer.clientWidth;
		const height = this._divContainer.clientHeight;

		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();

		this._renderer.setSize( width, height );

	}

	render( time ) {

		this._renderer.render( this._scene, this._camera );
		this.update( time );
		if ( this._isAnimating ) {

			this._animationId = requestAnimationFrame( this.render.bind( this ) );

		}

	}

	update( time ) {

		time *= 0.001;
		
		// 모든 모델 회전
		this._models.forEach(model => {
			if (this.isRotating) {
				model.rotation.y = time * this.rotationSpeed;
			}
		});

	}

	startAnimation() {

		if ( ! this._isAnimating ) {

			this._isAnimating = true;
			this._animationId = requestAnimationFrame( this.render.bind( this ) );

		}

	}

	stopAnimation() {

		if ( this._isAnimating ) {

			this._isAnimating = false;
			if ( this._animationId ) {

				cancelAnimationFrame( this._animationId );

			}

		}

	}

	toggleAnimation() {

		if ( this._isAnimating ) {

			this.stopAnimation();

		} else {

			this.startAnimation();

		}

	}

	saveScreenshot() {

		const timestamp = new Date().toISOString().replace( /[:.]/g, '-' );
		const filename = `screenshot-${timestamp}.png`;

		this._renderer.render( this._scene, this._camera );

		const imageData = this._renderer.domElement.toDataURL( 'image/png' );

		const link = document.createElement( 'a' );
		link.href = imageData;
		link.download = filename;
		link.click();

		alert( '스크린샷이 저장되었습니다!' );

	}

	async copyToClipboard() {

		try {

			this._renderer.render( this._scene, this._camera );

			const canvas = this._renderer.domElement;
			canvas.toBlob( async ( blob ) => {

				try {

					if ( ! navigator.clipboard ) {

						throw new Error( '클립보드 API를 지원하지 않습니다.' );

					}

					await navigator.clipboard.write( [
						new ClipboardItem( {
							'image/png': blob
						} )
					] );
					alert( '클립보드에 복사되었습니다!' );

				} catch ( error ) {

					console.error( '클립보드 복사 실패:', error );
					alert( '클립보드 복사에 실패했습니다.' );

				}

			}, 'image/png' );

		} catch ( error ) {

			console.error( '이미지 생성 실패:', error );
			alert( '이미지 생성에 실패했습니다.' );

		}

	}

	async shareToKakao() {

		try {

			const githubPagesUrl = 'https://hyeonseong2023.github.io/3D-Share-Test';
			const imageUrl = `${githubPagesUrl}/study/images/flower.png`;

			Kakao.Share.sendDefault( {
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
			} );

		} catch ( error ) {

			console.error( '카카오톡 공유 실패:', error );
			alert( '카카오톡 공유에 실패했습니다.' );

		}

	}

}

window.onload = () => {

	new App();

};
