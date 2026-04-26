import { test, expect, type Page } from '@playwright/test';

const mockUser = {
  id: 'user-1',
  name: 'Test Candidate',
  username: 'testcandidate',
  email: 'candidate@example.com',
  avatar: null,
};

async function mockAuthenticatedApis(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          user: mockUser,
        },
      },
    });
  });
}

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('token', 'test-token');
    window.localStorage.setItem('user', JSON.stringify(user));
  }, mockUser);
}

test('auth flow signs in and lands on dashboard', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          token: 'test-token',
          user: mockUser,
        },
      },
    });
  });

  await mockAuthenticatedApis(page);

  await page.route('**/api/v1/interviews/stats', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          totalInterviews: 8,
          completedInterviews: 6,
          averageScore: 84,
          highestScore: 93,
          rank: 4,
          interviewsByType: {
            behavioral: 3,
            technical: 3,
            'system-design': 2,
          },
        },
      },
    });
  });

  await page.route('**/api/v1/interviews', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          success: true,
          data: {
            interviews: [],
          },
        },
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('candidate@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'DASHBOARD' })).toBeVisible();
  await expect(page.getByText(/Test, this is your operating layer/)).toBeVisible();
});

test('interview setup creates a session and navigates into the room', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await mockAuthenticatedApis(page);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });

    class MockAudioContext {
      createAnalyser() {
        return {
          fftSize: 256,
          frequencyBinCount: 32,
          getByteFrequencyData: (array: Uint8Array) => array.fill(10),
        };
      }

      createMediaStreamSource() {
        return {
          connect: () => undefined,
        };
      }

      close() {
        return Promise.resolve();
      }
    }

    class MockWebSocket {
      static OPEN = 1;
      readyState = 1;
      onopen: ((event?: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;

      constructor() {
        setTimeout(() => this.onopen?.(), 0);
      }

      send() {}
      close() {
        this.onclose?.();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    });

    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      value: MockWebSocket,
    });
  });

  await page.route('**/api/v1/interviews', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          success: true,
          data: {
            interview: {
              id: 'interview-123',
              user_id: mockUser.id,
              type: 'technical',
              status: 'pending',
              score: null,
              feedback: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        success: true,
        data: {
          interviews: [],
        },
      },
    });
  });

  await page.route('**/api/v1/interviews/interview-123', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          interview: {
            id: 'interview-123',
            user_id: mockUser.id,
            type: 'technical',
            status: 'in-progress',
            score: null,
            feedback: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      },
    });
  });

  await page.goto('/interview-setup');
  await page.getByRole('button', { name: 'Connect' }).click();
  await page.getByRole('button', { name: /^Technical\b/ }).click();
  await page.getByRole('button', { name: 'Python' }).click();
  await page.getByRole('button', { name: 'Start Interview' }).click();

  await expect(page).toHaveURL(/\/interview\/interview-123$/);
});

test('feedback report renders generated feedback', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await mockAuthenticatedApis(page);

  await page.route('**/api/v1/interviews/test-feedback/feedback', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          interview: {
            type: 'technical',
            status: 'completed',
            created_at: '2025-01-15T12:00:00.000Z',
          },
          feedback: {
            id: 'feedback-1',
            interview_id: 'test-feedback',
            overall_score: 88,
            summary: 'Strong interview with clear communication and solid debugging depth.',
            strengths: ['Explained tradeoffs clearly', 'Identified edge cases early'],
            improvements: ['Give tighter complexity analysis', 'Narrate implementation decisions sooner'],
            detailed_feedback: JSON.stringify([
              { name: 'Technical Depth', score: 90, feedback: 'Handled implementation details accurately.' },
              { name: 'Communication', score: 86, feedback: 'Reasoning was easy to follow.' },
            ]),
          },
        },
      },
    });
  });

  await page.goto('/feedback/test-feedback');

  await expect(page.getByRole('heading', { name: 'FEEDBACK REPORT' })).toBeVisible();
  await expect(page.getByText('88')).toBeVisible();
  await expect(page.getByText('Strong interview with clear communication and solid debugging depth.')).toBeVisible();
  await expect(page.getByText('Explained tradeoffs clearly')).toBeVisible();
  await expect(page.getByText('Give tighter complexity analysis')).toBeVisible();
});
