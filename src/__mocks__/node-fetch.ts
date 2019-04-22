// from http://www.wheresrhys.co.uk/fetch-mock/

import fetchMockModule from 'fetch-mock';

const nodeFetch = jest.requireActual('node-fetch');
const fetchMock = fetchMockModule.sandbox();
Object.assign(fetchMock.config, nodeFetch, {
  fetch: nodeFetch
});
export default fetchMock;
