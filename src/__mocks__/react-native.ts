export const Linking = {
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(true),
};

export const Platform = {
  OS: 'android',
  select: (dict: any) => dict.android || dict.default,
};
