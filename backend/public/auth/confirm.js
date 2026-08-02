(function() {
  var hash = window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var accessToken = params.get('access_token');
  var refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    localStorage.setItem('pending_auth_tokens', JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken
    }));
  }

  var deepLink = 'jsrlending://login#' + hash;
  document.getElementById('open-btn').href = deepLink;
})();