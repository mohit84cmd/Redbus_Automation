import { Page, APIRequestContext } from '@playwright/test';
import { HomePage } from './HomePage';
import { BusResultsPage } from './BusResultsPage';
import { HotelPage } from './HotelPage';
import { TrainPage } from './TrainPage';
import { ApiClient } from '../utils/apiClient';

export class RedBusApplication {
  readonly page: Page;
  readonly homePage: HomePage;
  readonly busResultsPage: BusResultsPage;
  readonly hotelPage: HotelPage;
  readonly trainPage: TrainPage;
  readonly apiClient: ApiClient;

  constructor(page: Page, requestContext: APIRequestContext) {
    this.page = page;
    this.homePage = new HomePage(page);
    this.busResultsPage = new BusResultsPage(page);
    this.hotelPage = new HotelPage(page);
    this.trainPage = new TrainPage(page);
    this.apiClient = new ApiClient(requestContext);
  }

  /**
   * Helper to perform page navigation and start a bus search.
   */
  async navigateAndSearchBuses(source: string, destination: string): Promise<void> {
    await this.homePage.navigate();
    await this.homePage.searchBuses(source, destination);
  }

  /**
   * Workflow 1: Complete search flow and select first seat.
   */
  async searchBusesAndSelectSeatWorkflow(source: string, destination: string): Promise<void> {
    await this.navigateAndSearchBuses(source, destination);
    await this.busResultsPage.waitForResultsViaAPI();
    await this.busResultsPage.clickViewSeatsForFirst();
  }

  /**
   * Workflow 2: Search buses and apply AC filter.
   */
  async searchAndApplyACFilterWorkflow(source: string, destination: string): Promise<number> {
    await this.navigateAndSearchBuses(source, destination);
    await this.busResultsPage.waitForResultsViaAPI();
    await this.busResultsPage.applyACFilter();
    return this.busResultsPage.getBusCount();
  }
}
