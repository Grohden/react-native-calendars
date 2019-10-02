import _ from 'lodash'

export function shouldUpdate(a: object, b: object, paths: string[]) {
  for (const path of paths) {
    const equals = _.isEqual(_.get(a, path), _.get(b, path));
    if (!equals) {
      return true;
    }
  }
  return false;
}

