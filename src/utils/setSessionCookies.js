export const setSessionCookies = (res, session) => {
  // sessionId cookie
  res.cookie('sessionId', session._id.toString(), {
    httpOnly: true,
    sameSite: 'lax',
  });

  // refreshToken cookie
  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
  });
};
