import _ from 'lodash';
import React from 'react';
import {
  ImageStyle,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SectionList, SectionListData,
  SectionListProps,
  StyleProp,
  Text,
  TextStyle,
  ViewStyle, ViewToken
} from 'react-native';
import XDate from 'xdate';

import styleConstructor from './style';
import asCalendarConsumer, { CalendarConsumerProps } from './asCalendarConsumer';
import { CalendarTheme } from '../types';
import * as commons from './commons';
const UPDATE_SOURCES = commons.UPDATE_SOURCES;

type SectionItem = {
  title: string;
}

type Props = SectionListProps<SectionItem> & CalendarConsumerProps & {
  theme?: CalendarTheme;

  /** day format in section title. Formatting values: http://arshaw.com/xdate/#Formatting */
  dayFormat: string;
  /** style passed to the section view */
  sectionStyle: StyleProp<ViewStyle>;
}

/**
 * @description: AgendaList component
 * @extends: SectionList
 * @notes: Should be wraped in CalendarProvider component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class AgendaList extends React.Component<Props> {
  static displayName = 'AgendaList';

  static defaultProps = {
    dayFormat: 'dddd, MMM d'
  }

  style: {
    [k: string]: ViewStyle| TextStyle | ImageStyle;
  }

  sectionHeight = 0

  _topSection: string

  didScroll: boolean

  sectionScroll: boolean

  viewabilityConfig: {
    itemVisiblePercentThreshold: number;
  };

  list: React.RefObject<SectionList<SectionItem>>

  constructor(props: Props) {
    super(props);
    this.style = styleConstructor(props.theme);

    this._topSection = _.get(props, 'sections[0].title');
    this.didScroll = false;
    this.sectionScroll = false;

    this.viewabilityConfig = {
      // 50 means if 50% of the item is visible
      itemVisiblePercentThreshold: 20
    };
    this.list = React.createRef();
  }

  getSectionIndex(date: string) {
    // NOTE: sections titles should match current date format!!!
    return this.props.sections.findIndex((section) =>
      section.title === date
    );
  }

  componentDidUpdate(prevProps: Props) {
    const {updateSource, date} = this.props.context;
    if (date !== prevProps.context.date) {
      // NOTE: on first init data should set first section to the current date!!!
      if (updateSource !== UPDATE_SOURCES.LIST_DRAG && updateSource !== UPDATE_SOURCES.CALENDAR_INIT) {
        const sectionIndex = this.getSectionIndex(date);
        this.scrollToSection(sectionIndex);
      }
    }
  }

  scrollToSection(sectionIndex: number) {
    if (this.list.current && sectionIndex !== undefined) {
      this.sectionScroll = true; // to avoid setDate() in onViewableItemsChanged
      this._topSection = this.props.sections[sectionIndex].title;

      this.list.current.scrollToLocation!({
        animated: true,
        sectionIndex: sectionIndex,
        itemIndex: 0,
        viewPosition: 0, // position at the top
        viewOffset: commons.isAndroid ? this.sectionHeight : 0
      });
    }
  }

  onViewableItemsChanged = ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    if (viewableItems && !this.sectionScroll) {
      const topSection = _.get(viewableItems[0], 'section.title');

      if (topSection && topSection !== this._topSection) {
        this._topSection = topSection;

        // to avoid setDate() on first load (while setting the initial context.date value)
        if (this.didScroll) {
          this.props.context.setDate(
            this._topSection,
            UPDATE_SOURCES.LIST_DRAG
          );
        }
      }
    }
  }

  onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!this.didScroll) {
      this.didScroll = true;
    }

    if(this.props.onScroll){
      this.props.onScroll(event);
    }
  }

  onMomentumScrollBegin = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.props.context.setDisabled(true);

    if(this.props.onMomentumScrollBegin){
      this.props.onMomentumScrollBegin(event);
    }
  }

  onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // when list momentum ends AND when scrollToSection scroll ends
    this.sectionScroll = false;
    this.props.context.setDisabled(false);
    if(this.props.onMomentumScrollEnd) {
      this.props.onMomentumScrollEnd(event);
    }
  }

  onHeaderLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    this.sectionHeight = nativeEvent.layout.height;
  }

  renderSectionHeader = (header: { section: SectionListData<SectionItem> }) => {
    const { section: { title }} = header;
    const today = new XDate()
      .toString(this.props.dayFormat)
      .toUpperCase();
    const date = new XDate(title)
      .toString(this.props.dayFormat)
      .toUpperCase();

    const locale = XDate.locales[XDate.defaultLocale];
    const todayString = (locale as { today?: string }).today || commons.todayString;
    const sectionTitle = date === today
      ? `${todayString.toUpperCase()}, ${date}`
      : date;

    return (
      <Text
        allowFontScaling={false}
        style={[
          this.style.sectionText,
          this.props.sectionStyle
        ]}
        onLayout={this.onHeaderLayout}>
        {sectionTitle}
      </Text>
    );
  }

  render() {
    return (
      <SectionList
        {...this.props}
        ref={ r => {
          // DefinitelyTyped/issues/31065 (noice)
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          this.list.current = r;
        }}
        stickySectionHeadersEnabled
        keyExtractor={(_, index) => String(index)}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={this.onViewableItemsChanged}
        viewabilityConfig={this.viewabilityConfig}
        renderSectionHeader={this.renderSectionHeader}
        onScroll={this.onScroll}
        onMomentumScrollBegin={this.onMomentumScrollBegin}
        onMomentumScrollEnd={this.onMomentumScrollEnd}
        // onScrollToIndexFailed={(info) => { console.warn('onScrollToIndexFailed info: ', info); }}
        // getItemLayout={this.getItemLayout} // onViewableItemsChanged is not updated when list scrolls!!!
      />
    );
  }

  // getItemLayout = (data, index) => {
  //   return {length: commons.screenWidth, offset: commons.screenWidth  * index, index};
  // }
}

export default asCalendarConsumer(AgendaList);
