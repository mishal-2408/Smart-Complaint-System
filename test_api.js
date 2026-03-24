async function test() {
    try {
        const id = Date.now();
        // Register user
        let res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'api_test_' + id, email: `api${id}@test.com`, password: 'abc', role: 'user' })
        });
        const data = await res.json();
        if (!res.ok) {
            console.log("Register failed:", data);
            return;
        }
        const user = data.user;
        console.log("Registered user:", user._id);

        // Submit complaint
        const formData = new FormData();
        formData.append('title', 'API Test');
        formData.append('description', 'Urgent issue');
        formData.append('userId', user._id);

        res = await fetch('http://localhost:5000/api/complaints', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        console.log("Complaint Submit Status:", res.status);
        console.log("Response:", result);
    } catch(err) {
        console.error(err);
    }
}
test();
