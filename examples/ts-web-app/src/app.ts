export interface GreetingProps {
  name: string;
}

export const renderGreeting = ({ name }: GreetingProps): string => `Hello, ${name}!`;
