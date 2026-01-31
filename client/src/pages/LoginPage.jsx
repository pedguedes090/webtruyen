import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiLogin(email, password);
            if (response.success) {
                login(response.user, response.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-dark-card p-8 shadow-lg dark:shadow-none">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-primary mb-2">Đăng nhập</h1>
                        <p className="text-sm text-gray-500">Chào mừng bạn trở lại!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm" role="alert">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang xử lý…
                                </>
                            ) : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="text-primary hover:underline">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default LoginPage;
