package com.laudiumbiz.Laudiumbiz.Utils;

import java.util.HashMap;

public class TypedMap extends HashMap<String, Object> {
  public <T> T get(String key, Class<T> type) {
    return type.cast(get(key));
  }
}
