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


/**
 * 최신 scrape 워크플로우 실행 상태를 확인한다.
 * @returns 'queued' | 'in_progress' | 'completed' | 'failure' | 'unknown'
 */
export async function checkWorkflowStatus(): Promise<string> {
  if (!GH_TOKEN) return 'unknown';

  const apiUrl = `https://api.github.com/repos/${GH_REPO}/actions/workflows/scrape.yml/runs?per_page=1`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${GH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return 'unknown';

    const data = await response.json();
    const runs = data.workflow_runs;
    if (!runs || runs.length === 0) return 'unknown';

    const latest = runs[0];
    if (latest.status === 'completed') {
      return latest.conclusion === 'success' ? 'completed' : 'failure';
    }
    return latest.status; // 'queued' or 'in_progress'
  } catch {
    return 'unknown';
  }
}

/**
 * 워크플로우 완료까지 폴링한다.
 * @param onStatusChange 상태 변경 시 콜백
 * @param intervalMs 폴링 간격 (기본 10초)
 * @param maxAttempts 최대 시도 횟수 (기본 30 = 5분)
 * @returns 최종 상태
 */
export async function pollWorkflowUntilDone(
  onStatusChange?: (status: string) => void,
  intervalMs = 10000,
  maxAttempts = 30
): Promise<string> {
  // 워크플로우가 시작되기까지 잠시 대기
  await new Promise((r) => setTimeout(r, 5000));

  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkWorkflowStatus();
    onStatusChange?.(status);

    if (status === 'completed' || status === 'failure') {
      return status;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return 'timeout';
}
