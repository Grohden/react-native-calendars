import React from 'react';
import hoistNonReactStatic from 'hoist-non-react-statics';
import CalendarContext, { CalendarContextValue } from './calendarContext';

export type CalendarConsumerProps = {
  context: CalendarContextValue;
}

export default function asCalendarConsumer<P extends CalendarConsumerProps>(
  WrappedComponent: React.ComponentType<P>
){

  function CalendarConsumer(props: Omit<P, keyof CalendarConsumerProps>) {
    return (
      <CalendarContext.Consumer>
        {(context) => (
          <WrappedComponent
            context={context}
            { ...(props as P) }
          />
        )}
      </CalendarContext.Consumer>
    );
  }

  hoistNonReactStatic(CalendarConsumer, WrappedComponent);

  return CalendarConsumer;
}
