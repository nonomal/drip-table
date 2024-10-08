/**
 * This file is part of the drip-table project.
 * @link     : https://drip-table.jd.com/
 * @author   : helloqian12138 (johnhello12138@163.com)
 * @modifier : helloqian12138 (johnhello12138@163.com)
 * @copyright: Copyright (c) 2020 JD Network Technology Co., Ltd.
 */

import 'rc-color-picker/assets/index.css';
import './index.less';

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Col, Collapse, Form, Popover, Row, Tabs } from 'antd';
import { TabsPosition, TabsProps } from 'antd/lib/tabs';
import { DripTableProps, DripTableRecordTypeBase } from 'drip-table';
import React, { Component } from 'react';

import { safeEvaluate } from '@/utils/sandbox';
import RichText from '@/components/RichText';
import { DTGComponentPropertySchema } from '@/typing';

import BuiltInComponents, { CustomComponentProps, DTGComponentBaseProperty } from './components';

interface Props<T> {
  configs: DTGComponentPropertySchema[];
  groupType?: boolean | 'collapse' | 'tabs';
  labelAlign?: 'left' | 'right';
  tabPosition?: TabsPosition;
  tabProps?: TabsProps;
  wrapperClassName?: string;
  extraComponents?: Record<string, new <P extends CustomComponentProps>(props: P) => React.PureComponent<P>>;
  replacedComponents?: string[];
  data?: T;
  primaryKey?: string;
  extendKeys?: string[];
  mode?: 'old';
  icons?: DripTableProps<DripTableRecordTypeBase>['icons'];
  skippedKeys?: string[];
  /**
   * 将原本的数据转换成 FormData
   */
  decodeData?: (data: T, defaultData?: Record<string, unknown>) => Record<string, unknown>;
  /**
   * 将 FormData 转成 原本数据
   */
  encodeData: (formData: Record<string, unknown>) => T;
  onChange?: (data?: T) => void;
}

interface State {
  formValues: { [key: string]: unknown };
  helpMsg: { [key: string]: string };
}

export default class CustomForm<T> extends Component<Props<T>, State> {
  public constructor(props: Props<T>) {
    super(props);
    this.state = {
      formValues: {},
      helpMsg: {},
    };
  }

  public componentDidMount() {
    this.setState({ formValues: this.decodeData(this.props.data) });
  }

  public componentDidUpdate(prepProps: Props<T>) {
    const key = this.props.primaryKey || '$id';
    const preId = prepProps.data ? prepProps.data[key] : '';
    const thisId = this.props.data ? this.props.data[key] : '';
    if (preId !== thisId) {
      this.setState({ formValues: this.decodeData(this.props.data), helpMsg: {} });
    }
  }

  public formForceUpdate(data?: T) {
    this.setState({ formValues: this.decodeData(data || this.props.data), helpMsg: {} });
  }

  public flattenObject(obj, prefix = '', skippedKeys = [] as string[]) {
    let result = {};
    // 数组不再划分 交给 Array 组件处理
    if (Array.isArray(obj)) {
      const key = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
      result[key] = obj;
    } else {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const keySkipped = skippedKeys.includes(`${prefix}${key}`);
          if (keySkipped) {
            result[prefix + key] = obj[key];
          } else {
            result = { ...result, ...this.flattenObject(obj[key], `${prefix}${key}.`, skippedKeys) };
          }
        } else {
          result[prefix + key] = obj[key];
        }
      });
    }
    return result;
  }

  public decodeData(material?: T) {
    let obj: { [key: string]: unknown } = {};
    // 注入 defaultValue
    this.props.configs.forEach((item) => {
      if (item.default !== void 0 && this.visible(item)) { obj[item.name] = item.default; }
    });
    if (material) {
      if (this.props.mode === 'old') {
        Object.keys(material)
          .filter(key => (this.props.extendKeys ? !this.props.extendKeys.includes(key) : true))
          .forEach((key) => { obj[key] = material[key]; });
        if (this.props.extendKeys) {
          this.props.extendKeys.forEach(extKey =>
            Object.keys(material[extKey] || {})
              .forEach((key) => { obj[`${extKey}.${key}`] = (material[extKey] || {})[key]; }));
        }
      } else if (this.props.extendKeys) {
        Object.keys(material).forEach((key) => {
          obj = this.props.extendKeys?.includes(key)
            ? { ...obj, ...this.flattenObject(material[key], `${key}.`, this.props.skippedKeys) }
            : { ...obj, [key]: material[key] };
        });
      } else {
        obj = this.flattenObject(material, '', this.props.skippedKeys);
      }

      if (this.props.decodeData) {
        obj = { ...obj, ...this.props.decodeData(material, obj) };
      }
    }
    return obj;
  }

  private visible(config: DTGComponentPropertySchema) {
    const { formValues } = this.state;
    if (typeof config.visible === 'function') {
      return config.visible(formValues[config.name], formValues);
    } if (typeof config.visible === 'string') {
      return safeEvaluate(config.visible, { formData: formValues }, false);
    } if (typeof config.visible === 'boolean') {
      return config.visible;
    }
    return true;
  }

  public async submitData() {
    const { formValues, helpMsg } = this.state;
    let count = 0;
    const formData = Object.assign({}, formValues);
    const configs = this.props.configs.filter(config => this.visible(config));
    await configs.forEach(async (cfg) => {
      const value = formData[cfg.name] || cfg.default;
      const msg = cfg.validate ? await cfg.validate(value) : '';
      if (msg) {
        helpMsg[cfg.name] = msg;
        count += 1;
      } else if (formData[cfg.name] === void 0 && cfg.default) {
        formData[cfg.name] = cfg.default;
      }
    });
    this.setState({ helpMsg });
    if (count <= 0) {
      const result = this.props.encodeData(formData);
      return result;
    }
    return void 0;
  }

  public async changeData() {
    const data = await this.submitData();
    if (data && this.props.onChange) {
      this.props.onChange(data);
    }
  }

  public renderFormComponent(config: DTGComponentPropertySchema) {
    const { formValues, helpMsg } = this.state;
    const uiProps = config['ui:props'] || {};
    if (config['ui:type'] === 'render-html') {
      return (
        <RichText html={config.default as string} />
      );
    }
    if (config['ui:type']?.startsWith('custom::') || this.props.replacedComponents?.includes(config['ui:type'])) {
      const ComponentName = config['ui:type']?.replace('custom::', '');
      const CustomComponent = this.props.extraComponents?.[ComponentName] || config['ui:externalComponent'];
      if (!CustomComponent) { return <Alert message="未知表单组件" type="error" showIcon />; }
      return (
        <CustomComponent
          icons={this.props.icons}
          schema={config}
          value={formValues[config.name]}
          onChange={(value) => {
            formValues[config.name] = value;
            this.setState({ formValues }, () => {
              this.changeData();
            });
          }}
          onValidate={(msg: string) => {
            helpMsg[config.name] = msg || '';
            this.setState({ helpMsg });
          }}
          {...uiProps}
        />
      );
    }
    const BuiltInComponent = BuiltInComponents[config['ui:type']] as React.JSXElementConstructor<DTGComponentBaseProperty<unknown>>;
    if (BuiltInComponent) {
      return (
        <BuiltInComponent
          icons={this.props.icons}
          schema={config}
          value={formValues[config.name]}
          extraComponents={this.props.extraComponents}
          onChange={(value) => {
            formValues[config.name] = value;
            this.setState({ formValues }, () => {
              this.changeData();
            });
          }}
          onValidate={(msg) => {
            helpMsg[config.name] = msg || '';
            this.setState({ helpMsg });
          }}
          {...uiProps}
        />
      );
    }
    return <Alert message="未知表单组件" type="error" showIcon />;
  }

  public renderTitleLabel(config: DTGComponentPropertySchema) {
    const titleFragment = (
      <span style={{ marginRight: '6px' }}>
        { config['ui:title'] }
      </span>
    );
    if (config['ui:description']) {
      return (
        <div style={config['ui:titleStyle']}>
          { titleFragment }
          <Popover
            content={<RichText html={config['ui:description'].title} />}
            trigger={config['ui:description'].trigger}
          >
            <QuestionCircleOutlined />
          </Popover>
        </div>
      );
    }
    return (
      <div style={config['ui:titleStyle']}>{ titleFragment }</div>
    );
  }

  public renderFormItem(config: DTGComponentPropertySchema, index: number) {
    const { helpMsg } = this.state;
    const labelCol = config['ui:layout']?.labelCol || 8;
    const wrapperCol = config['ui:layout']?.wrapperCol || 16;
    const formItemLayout = {
      labelCol: { xs: { span: labelCol }, sm: { span: labelCol } },
      wrapperCol: { xs: { span: wrapperCol }, sm: { span: wrapperCol } },
    };
    const key = config.name;
    const visible = this.visible(config);
    if (!visible) { return null; }
    return (
      <React.Fragment key={index}>
        <Form.Item
          key={key}
          label={this.renderTitleLabel(config)}
          labelAlign={this.props.labelAlign || 'left'}
          colon={false}
          validateStatus={helpMsg[key] ? 'error' : 'success'}
          help={config['ui:layout']?.customHelpMsg ? '' : helpMsg[key]}
          required={config.required}
          className="jfe-drip-table-generator-custom-form-item"
          style={config['ui:wrapperStyle']}
          {...formItemLayout}
        >
          { !config['ui:layout']?.extraRow && this.renderFormComponent(config) }
          { config['ui:layout']?.customHelpMsg && helpMsg[key] && (
            <Alert style={{ padding: '4px 12px', height: '32px' }} message={helpMsg[key]} type="error" showIcon />
          ) }
        </Form.Item>
        { config['ui:layout']?.extraRow && (
          <Row>
            <Col span={24}>
              { this.renderFormComponent(config) }
            </Col>
          </Row>
        ) }
      </React.Fragment>
    );
  }

  public render() {
    const { configs } = this.props;
    if (this.props.groupType) {
      const groups = [...new Set(configs.map(item => item.group || ''))];
      const indexOfUnnamedGroup = groups.indexOf('');
      if (indexOfUnnamedGroup > -1) {
        groups[indexOfUnnamedGroup] = '其他';
      }
      if (this.props.groupType === 'collapse') {
        return (
          <Collapse>
            { groups.map((groupName, groupIndex) => {
              const subGroups = [...new Set(configs.filter(item => groupName === (item.group || '其他')).map(item => item.subGroup || ''))].filter(group => !!group);
              return (
                <Collapse.Panel key={groupIndex} header={groupName}>
                  { configs.filter(item => groupName === (item.group || '其他') && !item.subGroup).map((item, index) => this.renderFormItem(item, index)) }
                  { subGroups.length > 0 && (
                  <Collapse style={{ width: 'calc(100% + 24px)', marginLeft: '-12px' }}>
                    { subGroups.map((subGroupName, subGroupIndex) => (
                      <Collapse.Panel key={subGroupIndex} header={subGroupName}>
                        { configs.filter(item => groupName === (item.group || '其他') && item.subGroup === subGroupName).map((item, index) => this.renderFormItem(item, index)) }
                      </Collapse.Panel>
                    )) }
                  </Collapse>
                  ) }
                </Collapse.Panel>
              );
            }) }
          </Collapse>
        );
      }
      return (
        <Tabs
          tabPosition={this.props.tabPosition}
          type="card"
          centered
          {...this.props.tabProps}
          items={groups.map((groupName, groupIndex) => {
            const subGroups = [...new Set(configs.filter(item => groupName === (item.group || '其他')).map(item => item.subGroup || ''))].filter(group => !!group);
            return {
              label: groupName,
              key: String(groupIndex),
              children: (
                <div className={this.props.wrapperClassName}>
                  { configs.filter(item => groupName === (item.group || '其他') && !item.subGroup).map((item, index) => this.renderFormItem(item, index)) }
                  { subGroups.length > 0 && (
                  <Collapse style={{ width: 'calc(100% + 24px)', marginLeft: '-12px' }}>
                    { subGroups.map((subGroupName, subGroupIndex) => (
                      <Collapse.Panel key={subGroupIndex} header={subGroupName}>
                        { configs.filter(item => groupName === (item.group || '其他') && item.subGroup === subGroupName).map((item, index) => this.renderFormItem(item, index)) }
                      </Collapse.Panel>
                    )) }
                  </Collapse>
                  ) }
                </div>
              ),
            };
          })}
        />
      );
    }
    return (
      <div className={this.props.wrapperClassName}>
        { configs.map((item, index) => this.renderFormItem(item, index)) }
      </div>
    );
  }
}
