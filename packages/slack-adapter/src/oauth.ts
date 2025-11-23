import { InstallProvider } from '@slack/oauth';
import type { SlackOAuthConfig, SlackInstallation } from './types';

export class SlackOAuth {
  private installer: InstallProvider;

  constructor(config: SlackOAuthConfig) {
    this.installer = new InstallProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      stateSecret: process.env.SLACK_STATE_SECRET || 'my-state-secret',
    });
  }

  /**
   * Generate OAuth installation URL
   */
  generateInstallUrl(redirectUri: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.installer.clientId,
      scope: scopes.join(','),
      redirect_uri: redirectUri,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, redirectUri: string): Promise<SlackInstallation> {
    try {
      const installation = await this.installer.handleCallback({
        code,
        redirectUri,
      } as any);

      if (!installation.bot) {
        throw new Error('Bot installation failed');
      }

      return {
        teamId: installation.team?.id || '',
        teamName: installation.team?.name || '',
        accessToken: installation.bot.token || '',
        botUserId: installation.bot.userId || '',
        scopes: installation.bot.scopes || [],
        installedBy: installation.user?.id || '',
      };
    } catch (error: any) {
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
  }
}
