import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../api';

function RegisterPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);

        try {
            const response = await apiRegister(username, email, password);
            if (response.success) {
                navigate('/login', { state: { message: 'Đăng ký thành công! Vui lòng đăng nhập.' } });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-dark-card p-8 shadow-lg dark:shadow-none">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-primary mb-2">Đăng ký</h1>
                        <p className="text-sm text-gray-500">Tạo tài khoản để lưu tiến độ đọc</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tên người dùng</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-colors"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-colors"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng ký'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="text-primary hover:underline">
                                Đăng nhập
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default RegisterPage;
