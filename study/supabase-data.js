// Supabase 설정
const supabaseUrl = 'https://oolkuscvkgdziqfysead.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbGt1c2N2a2dkemlxZnlzZWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NTg0ODIsImV4cCI6MjA1NTMzNDQ4Mn0.WB7fxsUxVSoAjY_EcwHHrG06dVfqdFrEITzWQA_ixjY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 데이터를 가져오는 함수
async function fetchData() {
	try {
		console.log('데이터 가져오기 시작...');
		const { data, error } = await supabase
			.from('models')
			.select('*');

		if (error) {
			console.error('Supabase 에러:', error);
			throw error;
		}

		console.log('가져온 데이터:', data);
		return data;
	} catch (error) {
		console.error('데이터 가져오기 실패:', error);
		return null;
	}
}

// 데이터를 화면에 표시하는 함수
function displayData(data) {
	const container = document.getElementById('data-container');
	if (!data || data.length === 0) {
		container.innerHTML = '<p>데이터가 없습니다.</p>';
		return;
	}

	const html = data.map(item => `
        <div class="data-item">
            <p>모델 ID: ${item.model_id}</p>
            <p>이름: ${item.name}</p>
            <p>설명: ${item.description || '-'}</p>
        </div>
    `).join('');

	container.innerHTML = html;
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
	const data = await fetchData();
	displayData(data);
});
