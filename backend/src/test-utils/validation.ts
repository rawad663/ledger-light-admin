import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export const validateDto = async <T>(cls: new () => T, payload: object) => {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance as object as Record<string, unknown>);
  return errors;
};
