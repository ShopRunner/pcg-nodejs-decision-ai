import mockConsole from 'jest-mock-console';
import { SDK_NAME } from '../constant';
import { ConsoleLogger, LogLevel } from '../logger';

let restoreConsole: ReturnType<typeof mockConsole>;

beforeEach(() => {
  restoreConsole = mockConsole(['info', 'warn', 'error', 'debug']);
});

afterEach(() => {
  restoreConsole();
});

const levels = [
  {level: 'debug', consoleLevel: 'debug'},
  {level: 'info', consoleLevel: 'info'},
  {level: 'warn', consoleLevel: 'warn'},
  {level: 'error', consoleLevel: 'error'}
] as const;

describe('log level none', () => {
  levels.forEach(({level, consoleLevel}) => {
    it(`does not log level ${level}`, () => {
      const logger = new ConsoleLogger(LogLevel.NONE);
      logger[level]('test');
      expect(console[consoleLevel]).not.toHaveBeenCalled();
    });
  });
});

describe('log level debug', () => {
  levels.forEach(({level, consoleLevel}) => {
    it(`logs ${level}`, () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);
      logger[level]('test');
      expect(console[consoleLevel]).toHaveBeenCalledWith(`${SDK_NAME} ${level.toUpperCase()}:`, 'test');
    });
  });
});
