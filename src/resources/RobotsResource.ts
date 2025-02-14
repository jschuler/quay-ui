import {AxiosResponse} from 'axios';
import axios from 'src/libs/axios';
import {assertHttpCode} from './ErrorHandling';

export interface IRobot {
  name: string;
  created: string;
  last_accessed: string;
  teams: string[];
  repositories: string[];
  description: string;
}

export async function fetchAllRobots(orgnames: string[]) {
  return await Promise.all(orgnames.map((org) => fetchRobotsForNamespace(org)));
}

export async function fetchRobotsForNamespace(
  orgname: string,
  isUser = false,
): Promise<IRobot[]> {
  const getRobotsUrl = `/api/v1/organization/${orgname}/robots?permissions=true&token=false`;
  const response: AxiosResponse = await axios.get(getRobotsUrl);
  assertHttpCode(response.status, 200);
  return response.data?.robots;
}
