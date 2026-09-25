import { test as base, expect, Page } from '@playwright/test';

type TestFixtures = {
  clientPage: Page;
  userPage: (storageStateFile: string) => Promise<Page>;
};

const test = base.extend<TestFixtures>({
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext({ locale: 'pl-PL' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    let context: any;
    await use(async (storageStateFile: string) => {
      context = await browser.newContext({ 
        storageState: storageStateFile,
        locale: 'pl-PL'
      });
      return await context.newPage();
    });
    if (context) await context.close();
  }
});

async function addClientComment(page: Page, shareUrl: string, listName: string, commentText: string) {
  await test.step(`Klient otwiera listę [${listName}] i dodaje komentarz`, async () => {
    await page.goto(shareUrl);

    const listCard = page.locator('a.ui-list-box-item', {
      has: page.locator('.list-name', { hasText: listName }),
    });
    await listCard.click();
    
    const firstProposalItem = page.locator('.proposal-item').first();
    await firstProposalItem.scrollIntoViewIfNeeded();

    const commentsBox = firstProposalItem.locator('.proposal-item-comments');
    const startCommentBtn = commentsBox.getByRole('button', { name: /napisz komentarz/i });
    if (await startCommentBtn.isVisible()) {
      await startCommentBtn.click();
    } else {
      await commentsBox.click();
    }

    const editor = commentsBox.locator('.tiptap.ProseMirror[contenteditable="true"]');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill(commentText);
    await commentsBox.locator('button.kis-comment-form-submit').click();

    const publishedComment = commentsBox.locator('.kis-comment-body').filter({ hasText: commentText });
    await expect(publishedComment).toBeVisible({ timeout: 15000 });

    // Czekamy chwilę na zapisanie na backendzie
    await page.waitForTimeout(3000);
  });
}

test.beforeAll(() => {
  if (!process.env.CLIENT_LIVE_LIST_URL || !process.env.SHARED_LIST_NAME) {
    throw new Error('Brak wymaganych zmiennych środowiskowych w .env');
  }
});

test.describe('System Powiadomień KIS List - Komentarze Klienta na liście', () => {
  const listName = process.env.SHARED_LIST_NAME!;

  test('TC-SANITY: Właściciel projektu (Owner) otrzymuje powiadomienie o komentarzu Klienta', async ({ clientPage, userPage }) => {
    const liveListUrl = process.env.CLIENT_LIVE_LIST_URL!;
    const commentText = `QA Sanity Owner - ${Date.now()}`;

    await addClientComment(clientPage, liveListUrl, listName, commentText);

    await test.step('Właściciel projektu (Owner) otwiera powiadomienia i weryfikuje wpis', async () => {
      const page = await userPage('auth-owner.json');
      await page.goto('https://kislist.com/lists');

      const bellBtn = page.locator('#notifications-base button.tour_notifications, button[title="Pokaż powiadomienia"]').first();
      await bellBtn.click();
      
      const notificationsWindow = page.locator('.notifications-window').first();
      await expect(notificationsWindow).toBeVisible();

      const groupContainer = notificationsWindow
        .locator('.notification.group')
        .filter({ hasText: listName })
        .filter({ has: page.locator('svg[title="Udostępniona lista"]') });

      const isExpanded = await groupContainer.locator('.group-item').first().isVisible();
      if (!isExpanded) {
        await groupContainer.locator('.notification-title').click();
      }

      const targetCard = notificationsWindow.locator('.notification.group-item').filter({ hasText: commentText });
      
      await expect(targetCard).toBeVisible({ timeout: 15000 });
      await expect(targetCard.locator('.notification-context')).toContainText(/dodał.*komentarz/i);
    });
  });

  test('TC-REGRESSION (BUG-01): Członek zespołu (Tester) powinien otrzymać powiadomienie o komentarzu Klienta', async ({ clientPage, userPage }) => {
    test.fail(true, 'BUG-01: Silnik notyfikacji powiadamia jedynie Właściciela, pomijając przypisanych członków zespołu.');

    const liveListUrl = process.env.CLIENT_LIVE_LIST_URL!;
    const commentText = `QA Regression Tester - ${Date.now()}`;

    await addClientComment(clientPage, liveListUrl, listName, commentText);

    await test.step('Tester weryfikuje powiadomienia (Oczekiwany FAIL z powodu BUG-01)', async () => {
      const page = await userPage('auth-tester.json');
      await page.goto('https://kislist.com/lists');

      const bellBtn = page.locator('#notifications-base button.tour_notifications, button[title="Pokaż powiadomienia"]').first();
      await bellBtn.click();

      const notificationsWindow = page.locator('.notifications-window').first();

      const groupContainer = notificationsWindow
        .locator('.notification.group')
        .filter({ hasText: listName })
        .filter({ has: page.locator('svg[title="Udostępniona lista"]') });

      const groupCount = await groupContainer.count();
      if (groupCount > 0) {
        const isExpanded = await groupContainer.locator('.group-item').first().isVisible();
        if (!isExpanded) {
          await groupContainer.locator('.notification-title').click();
        }
      }

      const targetCard = notificationsWindow.locator('.notification.group-item').filter({ hasText: commentText });
      await expect(targetCard).toBeVisible({ timeout: 10000 }); 
    });
  });
});