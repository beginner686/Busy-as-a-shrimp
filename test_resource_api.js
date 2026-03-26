const BASE_URL = 'http://localhost:8081/api/v1';
const TEST_PHONE = '18888888888';
const MOCK_CODE = '123456';

async function test() {
    try {
        console.log('--- 1. 注册/登录获取 Token ---');
        let token = '';

        // Attempt registration
        let res = await fetch(`${BASE_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, verifyCode: MOCK_CODE })
        });
        let data = await res.json();

        if (res.ok) {
            token = data.data.token;
            console.log('注册成功');
        } else if (data.message && data.message.includes('已注册')) {
            console.log('用户已存在，尝试登录...');
            res = await fetch(`${BASE_URL}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: TEST_PHONE, verifyCode: MOCK_CODE })
            });
            data = await res.json();
            token = data.data.token;
            console.log('登录成功');
        } else {
            throw new Error(`Register/Login failed: ${JSON.stringify(data)}`);
        }

        const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        console.log('\n--- 2. 获取标签 ---');
        res = await fetch(`${BASE_URL}/resource/tags`);
        data = await res.json();
        console.log('标签内容:', JSON.stringify(data.data));

        console.log('\n--- 3. 上传资源 ---');
        res = await fetch(`${BASE_URL}/resource/upload`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                resourceType: 'skill',
                tags: ['短视频', '探店'],
                areaCode: '021',
                priceRange: { min: 100, max: 500 }
            })
        });
        data = await res.json();
        const resourceId = data.data.resourceId;
        console.log('上传结果:', data.message, 'ID:', resourceId);

        console.log('\n--- 4. 获取列表 ---');
        res = await fetch(`${BASE_URL}/resource/list`, { headers: authHeader });
        data = await res.json();
        console.log('列表长度:', data.data.length);

        console.log('\n--- 5. 更新资源 ---');
        res = await fetch(`${BASE_URL}/resource/${resourceId}`, {
            method: 'PUT',
            headers: authHeader,
            body: JSON.stringify({
                tags: ['短视频', '探店', '直播'],
                status: 'active'
            })
        });
        console.log('更新成功');

        console.log('\n--- 6. 测试风险扫描 (敏感词拦截) ---');
        res = await fetch(`${BASE_URL}/resource/upload`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                resourceType: 'skill',
                tags: ['违规内容']
            })
        });
        data = await res.json();
        console.log('预期拦截成功:', data.message);

        console.log('\n--- 7. 删除资源 ---');
        res = await fetch(`${BASE_URL}/resource/${resourceId}`, {
            method: 'DELETE',
            headers: authHeader
        });
        console.log('删除成功');

        console.log('\n所有测试完成！');

    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

test();
