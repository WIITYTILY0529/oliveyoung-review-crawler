const GH_TOKEN = import.meta.env.VITE_GH_TOKEN || '';
const GH_REPO = import.meta.env.VITE_GH_REPO || 'WIITYTILY0529/oliveyoung-review-crawler';

/**
 * GitHub Actions workflow_dispatch를 트리거한다.
 */
export async function triggerScrapeWorkflow(searchUrl: string): Promise<{ success: boolean; message: string }> {
  if (!GH_TOKEN) {
    return { success: false, message: 'GitHub 토큰이 설정되지 않았습니다. .env 파일을 확인하세요.' };
  }

  const apiUrl = `https://api.github.com/repos/${GH_REPO}/actions/workflows/scrape.yml/dispatches`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          search_url: searchUrl,
        },
      }),
    });

    if (response.status === 204) {
      return { success: true, message: '크롤링이 시작되었습니다. 1~2분 후 페이지를 새로고침하세요.' };
    }

    const errorBody = await response.text();
    return { success: false, message: `GitHub API 오류 (${response.status}): ${errorBody}` };
  } catch (err) {
    return { success: false, message: `네트워크 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}` };
  }
}
