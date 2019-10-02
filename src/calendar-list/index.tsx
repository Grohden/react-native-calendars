import React, { Component } from 'react';
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  TextStyle,
  View,
  ViewStyle, ViewToken
} from 'react-native';
import XDate from 'xdate';

import { parseDate, xdateToData } from '../interface';
import styleConstructor from './style';
import * as dateUtils from '../date.utils';
import { CalendarProps } from '../calendar';
import CalendarListItem from './item';
import CalendarHeader from '../calendar/header/index';
import { STATIC_HEADER } from '../testIDs';
import { TCalendarDate } from '../types';

const { width } = Dimensions.get('window');

type Props = CalendarProps & {
  horizontal?: boolean;
  calendarWidth?: number;
  calendarHeight?: number;
  pastScrollRange?: number;
  futureScrollRange?: number;
  showScrollIndicator?: boolean;
  scrollEnabled?: boolean;
  scrollsToTop?: boolean;
  removeClippedSubviews?: boolean;
  pagingEnabled?: boolean;
  calendarStyle?: StyleProp<ViewStyle>;
  staticHeader?: boolean;
  showIndicator?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

type State = {
  openDate: XDate;
  currentMonth: XDate;
  rows: PropBumpGambiarra[];
  texts: string[];
}

export type PropBumpGambiarra = (XDate | string) & {
  propbump?: number;
}

/**
 * @description: Calendar List component for both vertical and horizontal calendars
 * @extends: Calendar
 * @extendslink: docs/Calendar
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/calendarsList.js
 * @gif: https://github.com/wix/react-native-calendars/blob/master/demo/calendar-list.gif
 */
class CalendarList extends Component<Props, State> {
  static displayName = 'CalendarList';

  style: {
    [k: string]: ViewStyle | TextStyle;
  }

  listView: FlatList<PropBumpGambiarra> | null = null

  viewabilityConfig: {
    itemVisiblePercentThreshold: number;
  }

  static defaultProps = {
    horizontal: false,
    showScrollIndicator: false,
    scrollEnabled: true,
    scrollsToTop: false,
    removeClippedSubviews: Platform.OS !== 'android'
  };

  constructor(props: Props) {
    super(props);

    this.style = styleConstructor(props.theme);

    this.viewabilityConfig = {
      itemVisiblePercentThreshold: 20
    };

    const { pastScrollRange, futureScrollRange } = this.getRanges();
    const rows: PropBumpGambiarra[] = [];
    const texts: string[] = [];
    const date = parseDate(props.current) || new XDate();

    for (let i = 0; i <= pastScrollRange + futureScrollRange; i++) {
      const rangeDate = date.clone().addMonths(i - pastScrollRange, true);
      const rangeDateStr = rangeDate.toString('MMM yyyy');
      texts.push(rangeDateStr);
      /*
       * This selects range around current shown month [-0, +2] or [-1, +1] month for detail calendar rendering.
       * If `this.pastScrollRange` is `undefined` it's equal to `false` or 0 in next condition.
       */
      if (pastScrollRange - 1 <= i && i <= pastScrollRange + 1 || !pastScrollRange && i <= pastScrollRange + 2) {
        rows.push(rangeDate);
      } else {
        rows.push(rangeDateStr);
      }
    }

    this.state = {
      rows,
      texts,
      openDate: date,
      currentMonth: parseDate(props.current)
    };

    this.onViewableItemsChanged = this.onViewableItemsChanged.bind(this);
    this.renderCalendar = this.renderCalendar.bind(this);
    this.getItemLayout = this.getItemLayout.bind(this);
    this.onLayout = this.onLayout.bind(this);
  }

  getCalendarDimensions() {
    const {
      calendarWidth = width,
      calendarHeight = 360
    } = this.props;

    return {
      calendarWidth,
      calendarHeight
    };
  }

  getRanges() {
    const {
      pastScrollRange = 50,
      futureScrollRange = 50
    } = this.props;

    return {
      pastScrollRange,
      futureScrollRange
    };
  }

  onLayout(event: LayoutChangeEvent) {
    if (this.props.onLayout) {
      this.props.onLayout(event);
    }
  }

  scrollToDay(d: TCalendarDate, offset: number, animated: boolean) {
    const { pastScrollRange } = this.getRanges();
    const { calendarHeight, calendarWidth } = this.getCalendarDimensions();
    const day = parseDate(d);
    const diffMonths = Math.round(
      this.state.openDate
        .clone()
        .setDate(1)
        .diffMonths(day.clone().setDate(1))
    );

    const size = this.props.horizontal
      ? calendarWidth
      : calendarHeight;

    let scrollAmount = (size * pastScrollRange) + (diffMonths * size) + (offset || 0);

    if (!this.props.horizontal) {
      let week = 0;
      const days = dateUtils.page(day, this.props.firstDay);
      for (let i = 0; i < days.length; i++) {
        week = Math.floor(i / 7);
        if (dateUtils.sameDate(days[i], day)) {
          scrollAmount += 46 * week;
          break;
        }
      }
    }
    this.listView!.scrollToOffset({ offset: scrollAmount, animated });
  }

  scrollToMonth(dateMonth: TCalendarDate) {
    const { pastScrollRange } = this.getRanges();
    const { calendarWidth, calendarHeight } = this.getCalendarDimensions();
    const month = parseDate(dateMonth);
    const scrollTo = month || this.state.openDate;
    const diffMonths = Math.round(
      this.state.openDate
        .clone()
        .setDate(1)
        .diffMonths(scrollTo.clone().setDate(1))
    );
    const size = this.props.horizontal
      ? calendarWidth
      : calendarHeight;
    const scrollAmount = (size * pastScrollRange) + (diffMonths * size);

    this.listView!.scrollToOffset({ offset: scrollAmount, animated: false });
  }

  componentWillReceiveProps(props: Props) {
    const current = parseDate(this.props.current);
    const nextCurrent = parseDate(props.current);

    if (nextCurrent && current && nextCurrent.getTime() !== current.getTime()) {
      this.scrollToMonth(nextCurrent);
    }

    const rowClone = this.state.rows;
    const newRows: PropBumpGambiarra[] = [];

    for (let i = 0; i < rowClone.length; i++) {
      let val = this.state.texts[i] as (string | PropBumpGambiarra);
      if ((rowClone[i] as XDate).getTime) {
        const ohGodWhy = (rowClone[i] as
          (XDate & { propbump?: number })
        );

        val = ohGodWhy.clone();
        val.propbump = ohGodWhy.propbump
          ? ohGodWhy.propbump + 1
          : 1;
      }
      newRows.push(val);
    }
    this.setState({
      rows: newRows
    });
  }

  onViewableItemsChanged({ viewableItems }: { viewableItems: Array<ViewToken> }) {
    const { pastScrollRange } = this.getRanges();

    function rowIsCloseToViewable(index: number, distance: number) {
      for (let i = 0; i < viewableItems.length; i++) {
        // TODO: find out why someone put the parse on the if
        //  cuz ViewToken index is declared as number | null
        const viewableIndex = (viewableItems[i].index || 0) + '';

        if (Math.abs(index - parseInt(viewableIndex)) <= distance) {
          return true;
        }
      }
      return false;
    }

    const rowClone = this.state.rows;
    const newRows = [];
    const visibleMonths = [];

    for (let i = 0; i < rowClone.length; i++) {
      let val = rowClone[i];
      const rowShouldBeRendered = rowIsCloseToViewable(i, 1);

      if (rowShouldBeRendered && !(rowClone[i] as XDate).getTime) {
        val = this.state.openDate
          .clone()
          .addMonths(i - pastScrollRange, true);
      } else if (!rowShouldBeRendered) {
        val = this.state.texts[i];
      }

      newRows.push(val);

      if (rowIsCloseToViewable(i, 0)) {
        // FIXME: since val is a string | XDate
        //  this line will break if a string comes here.
        //  so I've put the instance of validation to avoid it.
        if (val instanceof XDate) {
          visibleMonths.push(xdateToData(val));
        }
      }
    }

    if (this.props.onVisibleMonthsChange) {
      this.props.onVisibleMonthsChange(visibleMonths);
    }

    this.setState({
      rows: newRows,
      currentMonth: parseDate(visibleMonths[0])
    });
  }

  renderCalendar({ item }: { item: PropBumpGambiarra }) {
    const {
      calendarWidth,
      calendarHeight
    } = this.getCalendarDimensions();

    return (
      <CalendarListItem
        scrollToMonth={ this.scrollToMonth.bind(this) }
        item={ item }
        calendarHeight={ calendarHeight }
        calendarWidth={
          this.props.horizontal
            ? calendarWidth
            : undefined
        }
        style={ this.props.calendarStyle }
        { ...this.props }
      />
    );
  }

  getItemLayout(_: PropBumpGambiarra[] | null, index: number) {
    const { calendarWidth, calendarHeight } = this.getCalendarDimensions();

    return {
      length: this.props.horizontal
        ? calendarWidth
        : calendarHeight,
      offset: (
        this.props.horizontal
          ? calendarWidth
          : calendarHeight
      ) * index,
      index
    };
  }

  getMonthIndex(month: XDate) {
    const { pastScrollRange } = this.getRanges();

    return this.state.openDate.diffMonths(month) + pastScrollRange;
  }

  addMonth(count: number) {
    this.updateMonth(
      this.state.currentMonth
        .clone()
        .addMonths(count, true)
    );
  }

  updateMonth(day: XDate, doNotTriggerListeners?: boolean) {
    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }

    this.setState({
      currentMonth: day.clone()
    }, () => {
      this.scrollToMonth(this.state.currentMonth);

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

  renderStaticHeader() {
    const { staticHeader, horizontal } = this.props;
    const useStaticHeader = staticHeader && horizontal;

    if (useStaticHeader) {
      return (
        <CalendarHeader
          style={ [
            this.style.staticHeader,
            this.props.headerStyle
          ] }
          month={ this.state.currentMonth }
          addMonth={ this.addMonth }
          showIndicator={ this.props.showIndicator }
          theme={ this.props.theme }
          hideArrows={ this.props.hideArrows }
          firstDay={ this.props.firstDay }
          renderArrow={ this.props.renderArrow }
          monthFormat={ this.props.monthFormat }
          hideDayNames={ this.props.hideDayNames }
          weekNumbers={ this.props.showWeekNumbers }
          onPressArrowLeft={ this.props.onPressArrowLeft }
          onPressArrowRight={ this.props.onPressArrowRight }
          testID={ STATIC_HEADER }
        />
      );
    }

    return null;
  }

  render() {
    const {
      pastScrollRange,
      futureScrollRange
    } = this.getRanges();

    return (
      <View>
        <FlatList
          onLayout={ this.onLayout }
          ref={ (c) => this.listView = c }
          //scrollEventThrottle={1000}
          style={ [
            this.style.container,
            this.props.style
          ] }
          initialNumToRender={ pastScrollRange + futureScrollRange + 1 }
          data={ this.state.rows }
          //snapToAlignment='start'
          //snapToInterval={this.calendarHeight}
          removeClippedSubviews={ this.props.removeClippedSubviews }
          // pageSize={ 1 } // FIXME: not present on FlatList, should be removed?
          horizontal={ this.props.horizontal }
          pagingEnabled={ this.props.pagingEnabled }
          onViewableItemsChanged={ this.onViewableItemsChanged }
          viewabilityConfig={ this.viewabilityConfig }
          renderItem={ this.renderCalendar }
          showsVerticalScrollIndicator={ this.props.showScrollIndicator }
          showsHorizontalScrollIndicator={ this.props.showScrollIndicator }
          scrollEnabled={ this.props.scrollEnabled }
          keyExtractor={ (_, index) => String(index) }
          initialScrollIndex={
            this.state.openDate
              ? this.getMonthIndex(this.state.openDate)
              : undefined
          }
          getItemLayout={ this.getItemLayout }
          scrollsToTop={ this.props.scrollsToTop }
        />
        { this.renderStaticHeader() }
      </View>
    );
  }
}

export default CalendarList;
