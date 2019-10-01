import React from 'react';
import { View, ViewStyle } from 'react-native';
import XDate from 'xdate';

import * as dateUtils from '../date.utils';
import { xdateToData, parseDate } from '../interface';
import styleConstructor from './style';
import Day from './day/basic';
import UnitDay from './day/period';
import MultiDotDay from './day/multi-dot';
import MultiPeriodDay from './day/multi-period';
import SingleDay from './day/custom';
import CalendarHeader from './header';
import shouldComponentUpdate from './updater';
import { SELECT_DATE_SLOT } from '../testIDs';
import {
  CalendarBaseProps,
  CalendarMarkingProps, DateCallbackHandler, TCalendarDate
} from '../types';

type Props = CalendarMarkingProps & CalendarBaseProps & {
  headerStyle: ViewStyle;
}

type State = {
  currentMonth: XDate;
}

/**
 * @description: Calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/calendars.js
 * @gif: https://github.com/wix/react-native-calendars/blob/master/demo/calendar.gif
 */
class Calendar extends React.Component<Props, State> {
  static displayName = 'Calendar';

  style: {
    [k: string]: ViewStyle;
  }

  constructor(props: Props) {
    super(props);

    this.style = styleConstructor(this.props.theme);

    this.state = {
      currentMonth: props.current ? parseDate(props.current) : new XDate()
    };

    this.updateMonth = this.updateMonth.bind(this);
    this.addMonth = this.addMonth.bind(this);
    this.pressDay = this.pressDay.bind(this);
    this.longPressDay = this.longPressDay.bind(this);
    // FIXME: shouldn't this be bound??
    this.shouldComponentUpdate = shouldComponentUpdate;
  }

  componentWillReceiveProps(nextProps: Props) {
    const current = parseDate(nextProps.current);
    if (current && current.toString('yyyy MM') !== this.state.currentMonth.toString('yyyy MM')) {
      this.setState({
        currentMonth: current.clone()
      });
    }
  }

  updateMonth(day: XDate, doNotTriggerListeners?: boolean) {
    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }

    this.setState({
      currentMonth: day.clone()
    }, () => {
      if (!doNotTriggerListeners) {
        const currMont = this.state.currentMonth.clone();
        if (this.props.onMonthChange) {
          this.props.onMonthChange(xdateToData(currMont));
        }
        if (this.props.onVisibleMonthsChange) {
          this.props.onVisibleMonthsChange([xdateToData(currMont)]);
        }
      }
    });
  }

  _handleDayInteraction(date: TCalendarDate, interaction?: DateCallbackHandler) {
    const day = parseDate(date);
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    if (!(minDate && !dateUtils.isGTE(day, minDate)) && !(maxDate && !dateUtils.isLTE(day, maxDate))) {
      const shouldUpdateMonth = this.props.disableMonthChange === undefined || !this.props.disableMonthChange;
      if (shouldUpdateMonth) {
        this.updateMonth(day);
      }
      if (interaction) {
        interaction(xdateToData(day));
      }
    }
  }

  pressDay(date: XDate) {
    this._handleDayInteraction(date, this.props.onDayPress);
  }

  longPressDay(date: XDate) {
    this._handleDayInteraction(date, this.props.onDayLongPress);
  }

  addMonth(count: number) {
    const { currentMonth } = this.state;
    this.updateMonth(
      currentMonth
        .clone()
        .addMonths(count, true)
    );
  }

  renderDay(day: XDate, id: number) {
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    let state = '';
    if (this.props.disabledByDefault) {
      state = 'disabled';
    } else if ((minDate && !dateUtils.isGTE(day, minDate)) || (maxDate && !dateUtils.isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!dateUtils.sameMonth(day, this.state.currentMonth)) {
      state = 'disabled';
    } else if (dateUtils.sameDate(day, new XDate())) {
      state = 'today';
    }

    if (!dateUtils.sameMonth(day, this.state.currentMonth) && this.props.hideExtraDays) {
      return (<View key={ id } style={ { flex: 1 } } />);
    }

    const DayComponent = this.getDayComponent();
    const date = day.getDate();
    const dateAsObject = xdateToData(day);

    return (
      <View style={ { flex: 1, alignItems: 'center' } } key={ id }>
        <DayComponent
          testID={ `${ SELECT_DATE_SLOT }-${ dateAsObject.dateString }` }
          state={ state }
          theme={ this.props.theme }
          onPress={ this.pressDay }
          onLongPress={ this.longPressDay }
          date={ dateAsObject }
          marking={ this.getDateMarking(day) }>
          { date }
        </DayComponent>
      </View>
    );
  }

  getDayComponent() {
    // if (this.props.dayComponent) {
    //   return this.props.dayComponent;
    // }

    switch (this.props.markingType) {
      case 'period':
        return UnitDay;
      case 'multi-dot':
        return MultiDotDay;
      case 'multi-period':
        return MultiPeriodDay;
      case 'custom':
        return SingleDay;
      default:
        return Day;
    }
  }

  getDateMarking(day: XDate) {
    if (!this.props.markedDates) {
      return false;
    }

    const dates = this.props.markedDates[day.toString('yyyy-MM-dd')];
    if (dates) {
      return dates || [];
    } else {
      return false;
    }
  }

  renderWeekNumber(weekNumber: number) {
    return (
      <Day
        key={ `week-${ weekNumber }` }
        theme={ this.props.theme }
        marking={ { disableTouchEvent: true } }
        state='disabled'>
        { weekNumber }
      </Day>
    );
  }

  renderWeek(days: XDate[], id: number) {
    const week = [];
    days.forEach((day, index) => {
      week.push(this.renderDay(day, index));
    }, this);

    if (this.props.showWeekNumbers) {
      week.unshift(this.renderWeekNumber(days[days.length - 1].getWeek()));
    }

    return (
      <View
        style={ this.style.week }
        key={ id }>
        { week }
      </View>
    );
  }

  render() {
    const days = dateUtils.page(this.state.currentMonth, this.props.firstDay);
    const weeks: JSX.Element[] = [];

    // FIXME: why not use map?
    while (days.length) {
      weeks.push(
        this.renderWeek(
          days.splice(0, 7),
          weeks.length
        )
      );
    }

    let indicator;
    const current = parseDate(this.props.current);
    if (current) {
      const lastMonthOfDay = current
        .clone()
        .addMonths(1, true)
        .setDate(1)
        .addDays(-1)
        .toString('yyyy-MM-dd');

      if (this.props.displayLoadingIndicator &&
        !(this.props.markedDates && this.props.markedDates[lastMonthOfDay])) {
        indicator = true;
      }
    }

    return (
      <View style={ [this.style.container, this.props.style] }>
        <CalendarHeader
          style={ this.props.headerStyle }
          theme={ this.props.theme }
          hideArrows={ this.props.hideArrows }
          month={ this.state.currentMonth }
          addMonth={ this.addMonth }
          showIndicator={ indicator }
          firstDay={ this.props.firstDay }
          renderArrow={ this.props.renderArrow }
          monthFormat={ this.props.monthFormat }
          hideDayNames={ this.props.hideDayNames }
          weekNumbers={ this.props.showWeekNumbers }
          onPressArrowLeft={ this.props.onPressArrowLeft }
          onPressArrowRight={ this.props.onPressArrowRight }
        />
        <View style={ this.style.monthView }>{ weeks }</View>
      </View>);
  }
}

export default Calendar;
