process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../src/utils/jwt');

describe('jwt access tokens', () => {
  const user = { id: 'u1', name: 'Dr. Test', role: 'admin', hospitalId: 'h1', cityId: null, refreshTokenVersion: 0 };

  it('round-trips claims through sign/verify', () => {
    const token = signAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('admin');
    expect(payload.hospitalId).toBe('h1');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAccessToken(user);
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('jwt refresh tokens', () => {
  it('embeds the refresh token version for logout-everywhere invalidation', () => {
    const user = { id: 'u2', refreshTokenVersion: 3 };
    const token = signRefreshToken(user);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('u2');
    expect(payload.v).toBe(3);
  });
});
