import React, { Component, ReactNode } from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Calendar from '../calendar';
import styleConstructor from './style';
import {
  CalendarMarkingProps,
  CalendarTheme,
  DateCallbackHandler, DayComponentProps, TCalendarDate
} from '../types';
import XDate from 'xdate';
import { PropBumpGambiarra } from './index';

type Props = CalendarMarkingProps & {
  hideArrows?: boolean;
  hideExtraDays?: boolean;
  theme?: CalendarTheme;
  item: PropBumpGambiarra;
  onPressArrowLeft?: (subtractMonth: () => void, date: XDate) => void;
  onPressArrowRight?: (addMonth: () => void, date: XDate) => void;
  calendarHeight?: number;
  calendarWidth?: number;
  style: StyleProp<ViewStyle>;
  hideDayNames?: boolean;
  onDayPress?: DateCallbackHandler;
  onDayLongPress?: DateCallbackHandler;
  displayLoadingIndicator?: boolean;
  minDate?: TCalendarDate;
  maxDate?: TCalendarDate;
  firstDay?: number;
  monthFormat?: string;
  dayComponent?: React.Component<DayComponentProps>;
  disabledByDefault?: boolean;
  showWeekNumbers?: boolean;
  renderArrow?: (direction: 'left' | 'right') => ReactNode;
  horizontal?: boolean;
  headerStyle?: ViewStyle;
  scrollToMonth: (month: XDate) => void;
}

class CalendarListItem extends Component<Props> {
  static displayName = 'IGNORE';

  static defaultProps = {
    hideArrows: true,
    hideExtraDays: true
  };

  style: {
    [k: string]: ViewStyle| TextStyle;
  }

  constructor(props: Props) {
    super(props);
    this.style = styleConstructor(props.theme);
  }

  shouldComponentUpdate(nextProps: Props) {
    const r1 = this.props.item;
    const r2 = nextProps.item;
    return r1.toString('yyyy MM') !== r2.toString('yyyy MM')
      || !!(r2.propbump && r2.propbump !== r1.propbump);
  }

  onPressArrowLeft = (subtractMonth: () => void, month: XDate) => {
    const monthClone = month.clone();

    if (this.props.onPressArrowLeft) {
      this.props.onPressArrowLeft(subtractMonth, monthClone);
    } else if (this.props.scrollToMonth) {
      monthClone.addMonths(-1);
      this.props.scrollToMonth(monthClone);
    }
  }

  onPressArrowRight = (addMonth: () => void, month: XDate) => {
    const monthClone = month.clone();

    if (this.props.onPressArrowRight) {
      this.props.onPressArrowRight(addMonth, monthClone);
    } else if (this.props.scrollToMonth) {
      monthClone.addMonths(1);
      this.props.scrollToMonth(monthClone);
    }
  }

  render() {
    const row = this.props.item;

    if ((row as XDate).getTime) {
      return (
        <Calendar
          theme={this.props.theme}
          style={[
            {
              height: this.props.calendarHeight,
              width: this.props.calendarWidth
            },
            this.style.calendar,
            this.props.style
          ]}
          current={row}
          hideArrows={this.props.hideArrows}
          hideExtraDays={this.props.hideExtraDays}
          disableMonthChange
          markedDates={this.props.markedDates}
          hideDayNames={this.props.hideDayNames}
          onDayPress={this.props.onDayPress}
          onDayLongPress={this.props.onDayLongPress}
          displayLoadingIndicator={this.props.displayLoadingIndicator}
          minDate={this.props.minDate}
          maxDate={this.props.maxDate}
          firstDay={this.props.firstDay}
          monthFormat={this.props.monthFormat}
          dayComponent={this.props.dayComponent}
          disabledByDefault={this.props.disabledByDefault}
          showWeekNumbers={this.props.showWeekNumbers}
          renderArrow={this.props.renderArrow}
          onPressArrowLeft={
            this.props.horizontal
              ? this.onPressArrowLeft
              : this.props.onPressArrowLeft
          }
          onPressArrowRight={
            this.props.horizontal
              ? this.onPressArrowRight
              : this.props.onPressArrowRight
          }
          headerStyle={
            this.props.horizontal
              ? this.props.headerStyle
              : undefined
          }
        />);
    }

    const text = row.toString();

    return (
      <View style={[
        {
          height: this.props.calendarHeight,
          width: this.props.calendarWidth
        },
        this.style.placeholder
      ]}>
        <Text
          allowFontScaling={false}
          style={this.style.placeholderText}>
          {text}
        </Text>
      </View>
    );
  }
}

export default CalendarListItem;
